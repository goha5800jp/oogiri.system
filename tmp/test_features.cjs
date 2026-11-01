const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://localhost:3000/?mode=console', { waitUntil: 'networkidle' });

  // 1. Check tab titles
  const tabTexts = await page.$$eval('nav button span', spans => spans.map(s => s.innerText.trim()));
  console.log('Nav Tabs:', tabTexts.filter(t => t.includes('記録') || t.includes('サブ') || t.includes('メイン')));

  // 2. Check removed badges
  const pageContent = await page.content();
  console.log('Contains 各種構成・事前設定:', pageContent.includes('各種構成・事前設定'));
  console.log('Contains システム設定:', pageContent.includes('システム設定'));
  console.log('Contains 参加実績:', pageContent.includes('参加実績'));

  // 3. Test 印象モード
  console.log('Toggling 印象モード ON...');
  const impressionLabel = page.locator('text=印象モード:');
  const impressionSwitch = impressionLabel.locator('..').locator('button[role="switch"]');
  await impressionSwitch.click();
  await page.waitForTimeout(500);

  // Check if 投票機能 is displayed
  const votingFeatureLabel = page.locator('text=投票機能:');
  console.log('投票機能 switch visible:', await votingFeatureLabel.isVisible());

  // Check Audience voting section visible
  const audienceVotingSection = page.locator('text=観覧者スマートフォン投票');
  console.log('Audience voting section visible (when 投票機能 is ON):', await audienceVotingSection.isVisible());

  // 4. Toggle 投票機能 OFF
  console.log('Toggling 投票機能 OFF...');
  const votingFeatureSwitch = votingFeatureLabel.locator('..').locator('button[role="switch"]');
  await votingFeatureSwitch.click();
  await page.waitForTimeout(500);

  // Check Audience voting section hidden
  console.log('Audience voting section visible (when 投票機能 is OFF):', await audienceVotingSection.isVisible());

  // Check counter box input visible
  const counterInputs = page.locator('input[aria-label*="観覧者投票数"]');
  console.log('Counter inputs count:', await counterInputs.count());

  // Check 結果発表 button between participants and Answer Logs
  const announceBtn = page.locator('button:has-text("結果発表")');
  console.log('結果発表 button count:', await announceBtn.count());

  // Test invalid input error
  if (await counterInputs.count() > 0) {
    const firstInput = counterInputs.first();
    await firstInput.fill('0');
    await firstInput.press('Enter');
    await page.waitForTimeout(400);
    const toast0 = page.locator('text=1以上の整数を入力してください');
    console.log('Toast for 0 shown:', await toast0.count() > 0);

    await firstInput.fill('abc');
    await firstInput.press('Enter');
    await page.waitForTimeout(400);
    const toastAbc = page.locator('text=1以上の整数を入力してください');
    console.log('Toast for abc shown:', await toastAbc.count() > 0);

    // Valid number
    await firstInput.fill('5');
    await firstInput.press('Enter');
    await page.waitForTimeout(400);
    console.log('Input value after setting 5:', await firstInput.inputValue());
  }

  await page.screenshot({ path: '/tmp/test_impression_analog.png' });
  console.log('Screenshot taken at /tmp/test_impression_analog.png');

  await browser.close();
})();
