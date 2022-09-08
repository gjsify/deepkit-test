import type GLib from '@gjsify/types/GLib-2.0';

const mainloop: GLib.MainLoop | undefined = (globalThis as any)?.imports?.mainloop;

// This file is part of the gjsunit framework
// Please visit https://github.com/philipphoffmann/gjsunit for more information

let countTestsOverall = 0;
let countTestsFailed = 0;
let countTestsIgnored = 0;
let runtime = '';

const RED = '\x1B[31m';
const GREEN = '\x1B[32m';
const BLUE = '\x1b[34m';
const GRAY = '\x1B[90m';
const RESET = '\x1B[39m';

export interface Namespaces {
	[key: string]: () => (void | Promise<void>) | Namespaces;
}

export type Callback = () => Promise<void>;

// Makes this work on Gjs and Node.js
export const print = globalThis.print || console.log;

class MatcherFactory {

	public not?: MatcherFactory;

	constructor(protected readonly actualValue: any, protected readonly positive: boolean, withOpposite = true) {
		if (withOpposite) {
			this.not = new MatcherFactory(actualValue, !positive, false);
		}
	}

	triggerResult(success: boolean, msg: string) {
		if( (success && !this.positive) ||
			(!success && this.positive) ) {
			++countTestsFailed;
			throw new Error(msg);
		}
	}

	to(callback: (actualValue: any) => boolean) {
		this.triggerResult(callback(this.actualValue),
			'      Expected callback to validate'
		);
	}

	toBe(expectedValue: any) {
		this.triggerResult(this.actualValue === expectedValue,
			'      Expected values to match using ===\n' +
			'      Expected: ' + expectedValue + '\n' +
			'      Actual: ' + this.actualValue
		);
	}

	toEqual(expectedValue: any) {
		this.triggerResult(this.actualValue == expectedValue,
			'      Expected values to match using ==\n' +
			'      Expected: ' + expectedValue + '\n' +
			'      Actual: ' + this.actualValue
		);
	}

	toMatch(expectedValue: any) {
		if(typeof this.actualValue.match !== 'function') {
			throw new Error(`You can not use toMatch on type ${typeof this.actualValue}`);
		}
		this.triggerResult(!!this.actualValue.match(expectedValue),
			'      Expected values to match using regular expression\n' +
			'      Expression: ' + expectedValue + '\n' +
			'      Actual: ' + this.actualValue
		);
	}

	toBeDefined() {
		this.triggerResult(typeof this.actualValue !== 'undefined',
			'      Expected value to be defined'
		);
	}

	toBeUndefined() {
		this.triggerResult(typeof this.actualValue === 'undefined',
			'      Expected value to be undefined'
		);
	}

	toBeNull() {
		this.triggerResult(this.actualValue === null,
			'      Expected value to be null'
		);
	}

	toBeTruthy() {
		this.triggerResult(this.actualValue as unknown as boolean,
			'      Expected value to be truthy'
		);
	}

	toBeFalsy() {
		this.triggerResult(!this.actualValue,
			'      Expected value to be falsy'
		);
	}

	toContain(needle: any) {
		this.triggerResult(this.actualValue instanceof Array && this.actualValue.indexOf(needle) !== -1,
			'      Expected ' + this.actualValue + ' to contain ' + needle
		);
	}
	toBeLessThan(greaterValue: number) {
		this.triggerResult(this.actualValue < greaterValue,
			'      Expected ' + this.actualValue + ' to be less than ' + greaterValue
		);
	}
	toBeGreaterThan(smallerValue: number) {
		this.triggerResult(this.actualValue > smallerValue,
			'      Expected ' + this.actualValue + ' to be greater than ' + smallerValue
		);
	}
	toBeCloseTo(expectedValue: number, precision: number) {
		const shiftHelper = Math.pow(10, precision);
		this.triggerResult(Math.round((this.actualValue as unknown as number) * shiftHelper) / shiftHelper === Math.round(expectedValue * shiftHelper) / shiftHelper,
			'      Expected ' + this.actualValue + ' with precision ' + precision + ' to be close to ' + expectedValue
		);
	}
	toThrow() {
		let errorMessage = ''; 
		let didThrow = false;
		try {
			this.actualValue();
			didThrow = false;
		}
		catch(e) {
			errorMessage = e.message || '';
			didThrow = true;
		}
		const functionName = this.actualValue.name || typeof this.actualValue === 'function' ? "[anonymous function]" : this.actualValue.toString();
		this.triggerResult(didThrow,
			`      Expected ${functionName} to ${this.positive ? 'throw' : 'not throw'} an exception ${!this.positive && errorMessage ? `, but an error with the message "${errorMessage}" was thrown` : ''}`
		);
	}
}

export const describe = async function(moduleName: string, callback: Callback) {
	print('\n' + moduleName);
	await callback();
};

/** E.g on('Deno', () {  it(...) }) */
export const on = async function(name: string, version: string | Callback, callback: Callback) {
	name = name.toLowerCase();
	const runtime = (await getRuntime()).toLowerCase();

	if(typeof version === 'function') {
		callback = version;
	}

	if (!runtime.includes(name)) {
		++countTestsIgnored;
		return;
	}

	if(typeof version === 'string') {
		version = version.toLowerCase();
		// TODO allow version wildcards like 16.x.x
		if(!runtime.includes(version)) {
			countTestsIgnored;
			return
		}
	}

	await callback();
}

export const it = async function(expectation: string, callback: () => void | Promise<void>) {
	try {
		await callback();
		print(`  ${GREEN}✔${RESET} ${GRAY}${expectation}${RESET}`);
	}
	catch(e) {
		print(`  ${RED}❌${RESET} ${GRAY}${expectation}${RESET}`);
		print(`${RED}${e.message}${RESET}`);
		// if (e.stack) print(e.stack);
	}
}

export const expect = function(actualValue: any) {
	++countTestsOverall;

	const expecter = new MatcherFactory(actualValue, true);

	return expecter;
}

const runTests = async function(namespaces: Namespaces) {
	// recursively check the test directory for executable tests
	for( const subNamespace in namespaces ) {
		const namespace = namespaces[subNamespace];
		// execute any test functions
		if(typeof namespace === 'function' ) {
			await namespace();
		}
		// descend into subfolders and objects
		else if( typeof namespace === 'object' ) {
			await runTests(namespace);
		}
	}
}

const printResult = () => {

	if( countTestsIgnored ) {
		// some tests ignored
		print(`\n${BLUE}✔ ${countTestsIgnored} ignored test${ countTestsIgnored > 1 ? 's' : ''}${RESET}`);
	}

	if( countTestsFailed ) {
		// some tests failed
		print(`\n${RED}❌ ${countTestsFailed} of ${countTestsOverall} tests failed${RESET}`);
	}
	else {
		// all tests okay
		print(`\n${GREEN}✔ ${countTestsOverall} completed${RESET}`);
	}
}

const getRuntime = async () => {
	if(runtime && runtime !== 'Unknown') {
		return runtime;
	}

	if(globalThis.Deno?.version?.deno) {
		return 'Deno ' + globalThis.Deno?.version?.deno;
	} else {
		let process = globalThis.process;

		if(!process) {
			try {
				process = await import('process');
			} catch (error) {
				console.error(error)
				console.warn(error.message);
				runtime = 'Unknown'
			}
		}

		if(process?.versions?.gjs) {
			runtime = 'Gjs ' + process.versions.gjs;
		} else if (process?.versions?.node) {
			runtime = 'Node.js ' + process.versions.node;
		}
	}
	return runtime || 'Unknown';
}

const printRuntime = async () => {
	const runtime = await getRuntime()
	print(`Running on ${runtime}`);	
}

export const run = async (namespaces: Namespaces) => {

	printRuntime()
	.then(async () => {
		return runTests(namespaces)
		.then(() => {
			printResult();
			print();
			mainloop?.quit();
		})
	});

	// Run the GJS mainloop for async operations
	mainloop?.run();
}
