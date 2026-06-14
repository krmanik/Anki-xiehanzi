import { describe, it, expect } from 'vitest';
import pinzhu from './pinyinzhuyin';

describe('pinyinAndZhuyin', () => {
	it('tonifies a normal numeric-pinyin string', async () => {
		const [, text] = await pinzhu.pinyinAndZhuyin('zhong1 guo2', 'w-pinyin', 'w-pinyin');
		expect(text.normalize('NFC')).toContain('zhōng');
		expect(text.normalize('NFC')).toContain('guó');
	});

	it('does not throw on tokens with no tone digit or vowel (parse() → null)', async () => {
		// Regression: a malformed token used to crash on m[2] of a null match.
		await expect(pinzhu.pinyinAndZhuyin('xyz guo2', 'w-pinyin', 'w-pinyin')).resolves.toBeTruthy();
		const [, text] = await pinzhu.pinyinAndZhuyin('xyz guo2', 'w-pinyin', 'w-pinyin');
		expect(text).toContain('xyz'); // raw token preserved
		expect(text.normalize('NFC')).toContain('guó');
	});
});
