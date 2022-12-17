import { TEST_IMG_1_B64 } from '../fixtures/index';
import { OcrPlugin } from '../../lib/plugin';

describe('OcrPlugin', function () {
  const p = new OcrPlugin();
  describe('performOcr', function () {
    this.timeout(120000);

    it('should recognize image text', async function () {
      const { page } = await p.performOcr(
        null,
        null,
        TEST_IMG_1_B64,
        {verbose: true},
      );
      (page.text.trim().startsWith('Mild Splendour')).should.be.true;
      (page.text.trim().endsWith(' sky.')).should.be.true;
    });

    it('should recognize no text if the rectangle is empty', async function () {
      const { page } = await p.performOcr(
        null,
        null,
        TEST_IMG_1_B64,
        {
          rectangle: {
            left: 1,
            top: 1,
            width: 1,
            height: 1,
          },
          verbose: true,
        },
      );
      page.text.should.be.eql('');
    });

    it('should fail if no language found', async function () {
      await p.performOcr(
        null,
        null,
        TEST_IMG_1_B64,
        {
          languages: 'fra',
          verbose: true,
        },
      ).should.eventually.be.rejected;
    });

    it('should fail if image is invalid', async function () {
      await p.performOcr(
        null,
        null,
        '',
        {
          verbose: true,
        },
      ).should.eventually.be.rejected;
    });

  });
});
