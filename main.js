/**
 * IRIAM Icon Ring Creator - Main Logic
 */

(function () {
    const canvas = new fabric.Canvas('editor-canvas', {
        width: 512,
        height: 512,
        backgroundColor: 'transparent',
    });

    // Elements
    const thicknessSlider = document.getElementById('ring-thickness');
    const sizeSlider = document.getElementById('ring-size');
    const thicknessVal = document.getElementById('thickness-val');
    const sizeVal = document.getElementById('size-val');
    const rotationSlider = document.getElementById('image-rotation');
    const rotationVal = document.getElementById('rotation-val');
    const uploadInput = document.getElementById('image-upload');
    const downloadBtn = document.getElementById('download-btn');
    const toggleOverlayBtn = document.getElementById('toggle-overlay');
    const resetBtn = document.getElementById('reset-btn');

    let currentImage = null;
    let overlayCircle = null;
    let isOverlayVisible = false;

    // Mask parameters
    let outerRadius = 256;
    let innerRadius = outerRadius * 0.5;

    /**
     * Initialize / Re-render masking
     */
    function updateMask() {
        if (!currentImage) return;

        // Create the donut mask
        // Fabric.js logic: We use a clipPath
        // However, for complex shapes like a donut, we use a single Path with two counter-clockwise circles
        const centerX = 256;
        const centerY = 256;

        // Path string for a donut (SVG path)
        // Move to top, draw outer circle, move to top of inner, draw inner circle in opposite direction
        const pathData = `
            M ${centerX}, ${centerY - outerRadius}
            A ${outerRadius},${outerRadius} 0 1,1 ${centerX},${centerY + outerRadius}
            A ${outerRadius},${outerRadius} 0 1,1 ${centerX},${centerY - outerRadius}
            Z
            M ${centerX}, ${centerY - innerRadius}
            A ${innerRadius},${innerRadius} 0 1,0 ${centerX},${centerY + innerRadius}
            A ${innerRadius},${innerRadius} 0 1,0 ${centerX},${centerY - innerRadius}
            Z
        `;

        const maskPath = new fabric.Path(pathData, {
            absolutePositioned: true,
            fill: 'black'
        });

        currentImage.set('clipPath', maskPath);
        canvas.renderAll();
    }

    /**
     * Handle Image Upload
     */
    uploadInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (f) {
            const data = f.target.result;
            fabric.Image.fromURL(data, function (img) {
                // Remove old image
                if (currentImage) canvas.remove(currentImage);

                // Setup new image
                img.set({
                    left: 256,
                    top: 256,
                    originX: 'center',
                    originY: 'center',
                });

                // Scale to fit
                const scale = Math.max(512 / img.width, 512 / img.height);
                img.scale(scale);

                currentImage = img;
                canvas.add(img);
                updateMask();

                // Keep image at back
                img.sendToBack();
            });
        };
        reader.readAsDataURL(file);
    });

    /**
     * Controls
     */
    thicknessSlider.addEventListener('input', function () {
        const val = this.value;
        thicknessVal.textContent = `${val}%`;
        // innerRadius gets smaller as thickness gets larger? 
        // No, let's say 100% thick = inner radius 0
        // 10% thick = inner radius 90% of outer
        innerRadius = outerRadius * (1 - (val / 100));
        updateMask();
    });

    sizeSlider.addEventListener('input', function () {
        const val = parseInt(this.value);
        sizeVal.textContent = `${val}px`;
        outerRadius = val / 2;
        // Keep ratio for inner
        const thicknessPercent = thicknessSlider.value;
        innerRadius = outerRadius * (1 - (thicknessPercent / 100));
        updateMask();
    });

    rotationSlider.addEventListener('input', function () {
        if (!currentImage) return;
        const val = parseInt(this.value);
        rotationVal.textContent = `${val}°`;
        currentImage.set('angle', val);
        canvas.renderAll();
    });

    /**
     * Overlay Simulation
     */
    toggleOverlayBtn.addEventListener('click', function () {
        isOverlayVisible = !isOverlayVisible;
        this.textContent = `アイコン重ね合わせ：${isOverlayVisible ? 'ON' : 'OFF'}`;

        if (isOverlayVisible) {
            if (!overlayCircle) {
                overlayCircle = new fabric.Circle({
                    radius: 240, // Slightly smaller than mask
                    left: 256,
                    top: 256,
                    originX: 'center',
                    originY: 'center',
                    fill: 'rgba(255, 255, 255, 0.2)',
                    stroke: 'white',
                    strokeDashArray: [5, 5],
                    selectable: false,
                    evented: false
                });

                // Add text label
                const label = new fabric.Text('ICON AREA', {
                    left: 256,
                    top: 256,
                    originX: 'center',
                    originY: 'center',
                    fontSize: 24,
                    fill: 'white',
                    opacity: 0.5,
                    selectable: false,
                    evented: false
                });

                overlayCircle = new fabric.Group([overlayCircle, label], {
                    selectable: false,
                    evented: false
                });
            }
            canvas.add(overlayCircle);
            overlayCircle.bringToFront();
        } else if (overlayCircle) {
            canvas.remove(overlayCircle);
        }
        canvas.renderAll();
    });

    /**
     * Download
     */
    downloadBtn.addEventListener('click', function () {
        if (!currentImage) {
            alert('画像を選択してください。');
            return;
        }

        // Hide overlay before export
        const wasOverlayVisible = isOverlayVisible;
        if (wasOverlayVisible) {
            canvas.remove(overlayCircle);
        }

        // Export as 512x512
        const dataURL = canvas.toDataURL({
            format: 'png',
            quality: 1,
            width: 512,
            height: 512
        });

        // Create download link
        const link = document.createElement('a');
        link.download = 'iriam-icon-ring.png';
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Restore overlay
        if (wasOverlayVisible) {
            canvas.add(overlayCircle);
        }
    });

    /**
     * Reset / Delete Image
     */
    resetBtn.addEventListener('click', function () {
        if (!currentImage) return;

        if (confirm('取り込んだ画像を削除してもよろしいですか？')) {
            canvas.remove(currentImage);
            currentImage = null;
            uploadInput.value = ''; // Reset file input
            rotationSlider.value = 0;
            rotationVal.textContent = '0°';
            canvas.renderAll();
        }
    });

    // Handle Window Resize (for responsive canvas scaling if needed)
    // For now, let's keep it fixed at 512 but we could scale the CSS display
})();
