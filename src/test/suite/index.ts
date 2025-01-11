import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';

export function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
        timeout: 10000 // Increased timeout for VS Code extension tests
    });

    const testsRoot = path.resolve(__dirname);

    return new Promise<void>((c, e) => {
        // Changed pattern to match TypeScript test files
        glob('**/*.test.js', { cwd: testsRoot }, (err: Error | null, files: string[]) => {
            if (err) {
                console.error('Error finding test files:', err);
                return e(err);
            }

            console.log('Found test files:', files);

            // Add files to the test suite
            files.forEach((f: string) => {
                console.log('Adding test file:', path.resolve(testsRoot, f));
                mocha.addFile(path.resolve(testsRoot, f));
            });

            try {
                // Run the mocha test
                mocha.run(failures => {
                    if (failures > 0) {
                        e(new Error(`${failures} tests failed.`));
                    } else {
                        c();
                    }
                });
            } catch (err) {
                console.error('Error running tests:', err);
                e(err);
            }
        });
    });
} 