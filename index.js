require('dotenv').config()

const GhostInspectorApiKey = process.env.GHOST_INSPECTOR_API_KEY;
const GhostInspectorOrganizationId = process.env.GHOST_INSPECTOR_ORGANIZATION_ID;

const program = require('commander');
const fs = require('fs');
const ngrok = require('ngrok');
const ora = require('ora');
const chalk = require('chalk');
const GhostInspector = require('ghost-inspector')(GhostInspectorApiKey);

var findAllJsonFilesRecursively = function(dir) {
    var results = [];
    var list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        var stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            /* Recurse into a subdirectory */
            results = results.concat(findAllJsonFilesRecursively(file));
        } else if (file.toLowerCase().endsWith('.json')) { 
            /* Is a file */
            results.push(file);
        }
    });
    return results;
}

async function executeGhostInspectorTest (myOrganizationId, myTest) {
    // we pass the `wait: true` option to wait for test completion
    const result = await GhostInspector.executeTestOnDemand(myOrganizationId, myTest, { wait: true });
    return result;
}

async function openNgrokTunnel() {
    const spinner = ora('Creating ngrok tunnel...').start();
    // TODO make tunnel name and config path configurable
    const ngrokUrl = await ngrok.connect({
        addr: '8000',
        proto: 'http'
    });
    spinner.succeed(`ngrok tunnel successfully opened at "${chalk.green(ngrokUrl)}"`);
    return ngrokUrl;
}

async function closeNgrokTunnel() {
    const spinner = ora('Closing ngrok tunnel...').start();
    await ngrok.disconnect();
    await ngrok.kill();
    spinner.succeed('ngrok tunnel closed');
}

async function mainCommandHandler(tests) {
    try {    
        var exitCode = 0;
        
        if (fs.lstatSync(tests).isDirectory) {
            tests = findAllJsonFilesRecursively(tests);
        } else {
            tests = [tests];
        }

        console.log(`Found ${chalk.green(tests.length)} test(s) files.`);

        if (tests.length === 0) {
            return exitCode;
        }

        const ngrokUrl = await openNgrokTunnel();

        for (testFile of tests) {
            const testObject = require('./' + testFile);
            testObject.startUrl = ngrokUrl;
            const spinner = ora(`Running test "${chalk.green(testObject.name)}"...`).start();
            const result = await executeGhostInspectorTest(GhostInspectorOrganizationId, testObject);
            if (result.passing) {
                spinner.succeed(`Test "${chalk.green(testObject.name)}" passed`); 
            } else {
                exitCode = 1;
                spinner.fail(`Test "${chalk.green(testObject.name)}" failed`); 
                // TODO bettere handling of failing test
                console.log(result);
            }
        }
        
        await closeNgrokTunnel();
    } catch (e) {
        exitCode = 1;
        console.error(e);
    }

    return exitCode;
}

program
    .arguments('<tests>')
    .action(mainCommandHandler);

program.parse(process.argv);