import { describe, it, assert, spy } from '@gjsify/unit';
import { logSignals } from '@gjsify/utils';
import type { StructuredLogData } from '@gjsify/utils';

const createUncaughtException = async () => {
	throw new Error("top level error");
}

const sleep = (ms: number) => {
	return new Promise(resolve => setTimeout(resolve, ms))
}

export default async () => {
	await describe('logSignals', async () => {
        await it("should emit an uncaughtException event on a top level throw", async () => {
            const onUnhandledRejection = spy((_data: StructuredLogData) => {});

            const signalHandlerId = logSignals.connect("unhandledRejection", onUnhandledRejection);

			createUncaughtException();

			await sleep(10);

            logSignals.disconnect(signalHandlerId)

            assert.strictEqual(onUnhandledRejection.calls.length, 1, "f should be called.")
            // assert.strictEqual(onUnhandledRejection.calls[0].arguments[0], error)
        })
	});
}
