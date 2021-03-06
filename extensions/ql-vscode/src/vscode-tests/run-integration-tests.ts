import * as path from 'path';
import * as os from 'os';
import { runTests } from 'vscode-test';

// A subset of the fields in TestOptions from vscode-test, which we
// would simply use instead, but for the fact that it doesn't export
// it.
type Suite = {
  extensionDevelopmentPath: string;
  extensionTestsPath: string;
  launchArgs: string[];
};

/**
 * Run an integration test suite `suite`, retrying if it segfaults, at
 * most `tries` times.
 */
async function runTestsWithRetryOnSegfault(suite: Suite, tries: number): Promise<void> {
  for (let t = 0; t < tries; t++) {
    try {
      // Download and unzip VS Code if necessary, and run the integration test suite.
      await runTests(suite);
      return;
    } catch (err) {
      if (err === 'SIGSEGV') {
        console.error('Test runner segfaulted.');
        if (t < tries - 1)
          console.error('Retrying...');
      }
      else if (os.platform() === 'win32') {
        console.error(`Test runner caught exception (${err})`);
        if (t < tries - 1)
          console.error('Retrying...');
      }
      else {
        throw err;
      }
    }
  }
  console.error(`Tried running suite ${tries} time(s), still failed, giving up.`);
  process.exit(1);
}

/**
 * Integration test runner. Launches the VSCode Extension Development Host with this extension installed.
 * See https://github.com/microsoft/vscode-test/blob/master/sample/test/runTest.ts
 */
async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`.
    const extensionDevelopmentPath = path.resolve(__dirname, '../..');

    // List of integration test suites.
    // The path to the extension test runner script is passed to --extensionTestsPath.
    const integrationTestSuites = [
      // Tests with no workspace selected upon launch.
      {
        extensionDevelopmentPath: extensionDevelopmentPath,
        extensionTestsPath: path.resolve(__dirname, 'no-workspace', 'index'),
        launchArgs: ['--disable-extensions'],
      },
      // Tests with a simple workspace selected upon launch.
      {
        extensionDevelopmentPath: extensionDevelopmentPath,
        extensionTestsPath: path.resolve(__dirname, 'minimal-workspace', 'index'),
        launchArgs: [
          path.resolve(__dirname, '../../test/data'),
          '--disable-extensions',
        ]
      }
    ];

    for (const integrationTestSuite of integrationTestSuites) {
      await runTestsWithRetryOnSegfault(integrationTestSuite, 3);
    }
  } catch (err) {
    console.error(`Unexpected exception while running tests: ${err}`);
    process.exit(1);
  }
}

main();
