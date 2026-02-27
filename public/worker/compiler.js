// MindAR Compiler Worker (Module)

// 1. Shim window and document for MindAR
self.window = self;
self.document = {
    createElement: (tag) => {
        if (tag === 'canvas') {
            return new OffscreenCanvas(1, 1);
        }
        return {};
    }
};

// 2. Main Logic
self.onmessage = async (e) => {
    const { images } = e.data;

    if (e.data.type === 'compile') {
        try {
            console.log('Worker: Starting compilation...');
            postMessage({ type: 'progress', percent: 5, status: 'Loading compiler library...' });

            // 3. Dynamic Import (Populates window.MINDAR)
            await import('https://cdn.jsdelivr.net/npm/mind-ar@1.2.2/dist/mindar-image.prod.js');

            const MindARImage = self.window.MINDAR?.IMAGE;
            if (!MindARImage) {
                throw new Error('MINDAR.IMAGE not found');
            }

            const Compiler = MindARImage.Compiler;
            if (!Compiler) {
                throw new Error('Compiler not found');
            }

            const compiler = new Compiler();
            console.log('Worker: Compiler created');
            postMessage({ type: 'progress', percent: 10, status: 'Processing images...' });

            // Convert data URLs to ImageBitmap objects (which have width/height and work with drawImage)
            const imageBitmaps = [];
            for (let i = 0; i < images.length; i++) {
                const dataUrl = images[i];
                const response = await fetch(dataUrl);
                const blob = await response.blob();
                const bitmap = await createImageBitmap(blob);
                imageBitmaps.push(bitmap);

                const pct = 10 + ((i + 1) / images.length) * 20;
                postMessage({ type: 'progress', percent: Math.round(pct), status: `Loading image ${i + 1}/${images.length}` });
                console.log(`Worker: Loaded image ${i + 1}/${images.length}, size: ${bitmap.width}x${bitmap.height}`);
            }

            console.log('Worker: All images loaded. Starting feature extraction...');
            postMessage({ type: 'progress', percent: 35, status: 'Extracting features (this takes time)...' });

            // Compile using compileImageTargets
            // The method expects objects that can be drawn to canvas (ImageBitmap works)
            await compiler.compileImageTargets(imageBitmaps, (progress) => {
                const pct = 35 + (progress * 0.55);
                postMessage({ type: 'progress', percent: Math.round(pct), status: `Building features... ${Math.round(progress)}%` });
                console.log('Worker: Compile progress:', progress);
            });

            console.log('Worker: Feature extraction complete. Exporting data...');
            postMessage({ type: 'progress', percent: 92, status: 'Packaging target file...' });

            // Export the compiled data
            const dataBuffer = compiler.exportData();

            console.log('Worker: Export complete. Buffer size:', dataBuffer.byteLength);
            postMessage({ type: 'progress', percent: 98, status: 'Finalizing...' });

            // Send as blob
            const blob = new Blob([dataBuffer]);
            postMessage({ type: 'complete', blob: blob });

        } catch (err) {
            console.error('Worker Error:', err);
            postMessage({ type: 'error', error: err.message });
        }
    }
};
