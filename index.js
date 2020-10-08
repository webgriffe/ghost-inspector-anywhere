#!/usr/bin/env node
require('dotenv').config()

const GhostInspectorApiKey = process.env.GHOST_INSPECTOR_API_KEY;
const GhostInspectorOrganizationId = process.env.GHOST_INSPECTOR_ORGANIZATION_ID;

const program = require('commander');
const fs = require('fs');
const path = require('path');
const ngrok = require('ngrok');
const ora = require('ora');
const chalk = require('chalk');
const spawn = require('child_process');
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
        addr: process.env.NGROK_TUNNEL_PORT,
        proto: process.env.NGROK_TUNNEL_PROTO,
        bind_tls: (process.env.NGROK_TUNNEL_BIND_TLS == '1')
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

async function mainCommandHandler(tests, outputDir) {
    try {
        outputDir = path.resolve(process.cwd(), outputDir);
        if (!fs.lstatSync(outputDir).isDirectory) {
            console.error(`The provided output directory path "${outputDir}" is not a directory.`)
            return 1;
        }

        var exitCode = 0;
        tests = path.resolve(process.cwd(), tests);

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

        if (program.setupScript) {
            const spinner = ora(`Executing setup script "${program.setupScript}"...`).start();
            try {
                spawn.execFileSync(program.setupScript, [ngrokUrl]);
            } catch (e) {
                spinner.fail(`Setup script "${program.setupScript}" failed.`);
                throw e;
            }
            spinner.succeed(`Successfully executed setup script "${program.setupScript}".`);
        }

        for (testFile of tests) {
            const testObject = JSON.parse(fs.readFileSync(testFile));
            testObject.startUrl = ngrokUrl;
            const spinner = ora(`Running test "${chalk.green(testObject.name)}"...`).start();
            const result = await executeGhostInspectorTest(GhostInspectorOrganizationId, testObject);
            if (result.passing) {
                spinner.succeed(`Test "${chalk.green(testObject.name)}" passed`);
            } else {
                exitCode = 1;
                spinner.fail(`Test "${chalk.green(testObject.name)}" failed`);
            }

            const now = new Date();
            const outputFilename = `${outputDir}/${now.getFullYear()}${now.getMonth()+1}${now.getDate()}${now.getHours()}${now.getMinutes()}${now.getSeconds()} - ${testObject.name}.json`;
            fs.writeFileSync(outputFilename, JSON.stringify(result, null, 2));
        }

        if (program.teardownScript) {
            const spinner = ora(`Executing tear down script "${program.teardownScript}"...`).start();
            try {
                spawn.execFileSync(program.teardownScript, [ngrokUrl]);
            } catch (e) {
                spinner.fail(`Tear down script "${program.teardownScript}" failed.`);
                throw e;
            }
            spinner.succeed(`Successfully executed tear down script "${program.teardownScript}".`);
        }

        await closeNgrokTunnel();
        process.exit(exitCode);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

program
    .arguments('<tests> <outputDir>')
    .option('--setup-script <script>', 'Set up script to run before running all tests. The ngrok tunnel URL will be passed as first argument.')
    .option('--teardown-script <script>', 'Tear down script to run after running all tests.')
    .action(mainCommandHandler);

program.parse(process.argv);
