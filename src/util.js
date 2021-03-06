#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const importLazy = require('import-lazy')(require);

const chalk = importLazy('chalk');
const boxen = importLazy('boxen');
const execa = importLazy('execa');
const Shell = importLazy('node-powershell');

const configPath = process.env.NODE_ENV === 'test' ? '/.nofan-test/' : '/.nofan/';
const homedir = os.homedir();

const defaultConfig = {
	CONSUMER_KEY: '13456aa784cdf7688af69e85d482e011',
	CONSUMER_SECRET: 'f75c02df373232732b69354ecfbcabea',
	DISPLAY_COUNT: 10,
	TIME_TAG: true,
	PHOTO_TAG: true,
	SSL: true,
	API_DOMAIN: 'api.fanfou.com',
	OAUTH_DOMAIN: 'fanfou.com',
	VERBOSE: false,
	COLORS: {
		name: 'green',
		text: '#cccccc',
		at: 'cyan',
		link: 'cyan.underline',
		tag: 'orange.bold',
		photo: 'grey',
		timeago: 'dim.green.italic',
		highlight: 'bgYellow.black'
	}
};

function createNofanDir() {
	try {
		fs.mkdirSync(`${homedir}${configPath}`);
	} catch {}
}

function createJsonFile(filename, content) {
	const filePath = `${homedir}${configPath}${filename}.json`;
	return fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
}

function readJsonFile(filename) {
	const filePath = `${homedir}${configPath}${filename}.json`;
	return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getConfig() {
	try {
		return readJsonFile('config');
	} catch {
		return defaultConfig;
	}
}

function getAccount() {
	try {
		return readJsonFile('account');
	} catch {
		return {};
	}
}

function setConfig(config) {
	return createJsonFile('config', config);
}

function setAccount(account) {
	return createJsonFile('account', account);
}

async function getTemporaryImagePath_Windows() {
	const temporaryPath = homedir + configPath + 'temp';
	const filepath = path.join(temporaryPath, 'temp.png');

	try {
		fs.mkdirSync(temporaryPath);
	} catch { }

	const ps = new Shell({
		executionPolicy: 'Bypass',
		noProfile: true
	});

	ps.addCommand('$img = Get-Clipboard -Format Image');
	ps.addCommand(`$img.save("${filepath}")`);

	try {
		await ps.invoke();
	} catch (err) {
		if (err.message && err.message.match('You cannot call a method on a null-valued expression.')) {
			process.spinner.fail('No image data found on the clipboard');
			process.exit(1);
		} else {
			console.log(err && err.message);
			process.exit(1);
		}
	} finally {
		ps.dispose();
	}

	return filepath;
}

async function getTemporaryImagePath_macOS() {
	const temporaryPath = homedir + configPath + 'temp';
	const filepath = path.join(temporaryPath, 'temp.png');

	try {
		fs.mkdirSync(temporaryPath);
	} catch { }

	try {
		await execa('pngpaste', [filepath]);
	} catch (err) {
		if (err.code === 'ENOENT') {
			const tip = `Please use ${chalk.green('`brew install pngpaste`')} to solve`;
			process.spinner.fail(`Required ${chalk.green('`pngpaste`')}\n\n` + boxen(tip, {padding: 1}));
			process.exit(1);
		}

		process.spinner.fail(err.stderr.trim());
		process.exit(1);
	}

	return filepath;
}

module.exports = {
	defaultConfig,
	createNofanDir,
	getConfig,
	getAccount,
	setConfig,
	setAccount,
	getTempImagePath_macOS: getTemporaryImagePath_macOS,
	getTempImagePath_Windows: getTemporaryImagePath_Windows
};
