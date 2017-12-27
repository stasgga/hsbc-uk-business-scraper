require('dotenv').config()
const puppeteer = require("puppeteer");
const util = require("util");
const prepend = util.promisify(require("prepend-file"));

const sleep = duration => new Promise(resolve => setTimeout(resolve, duration));

async function download(page) {
  await page.waitFor("input[value=txdownload]");
  await page.screenshot({path: 'y.png'});
  // sleep because eugh...
  await sleep(1000);

  console.log("clicking download statement...");
  await page.click("input[value=txdownload]");
  // await page.select("#formats", ["Microsoft Excel Spread Sheet"])
  await page.evaluate(() => {
    document.querySelector("select#formats option:last-child").selected = true;
  });
  await page.click("input[name='cmd_downloadTransactions']");

  console.log("opening download statement page...");

  await page.waitFor("a[title~='Download']");
  // await page.screenshot({path: 'g.png'});
  const href = await page.evaluate(
    () => document.querySelector("a[title~='Download']").href
  );
  // path = path || href.split("=")[0]
  // ids.push(href.split("=")[1])
  const downloadedContent = await page.evaluate(async downloadUrl => {
    const fetchResp = await fetch(downloadUrl, { credentials: "include" });
    return await fetchResp.text();
  }, href);

  console.log("writing to file...");
  await prepend("all.csv", downloadedContent);

  console.log("going back to statement page...");
  await page.click("input[value~='Back']");

  await page.waitFor("input[value='Previous Statement']");
  console.log("going to previous statement...");
  await page.screenshot({path: 'x.png'});
  await page.click("input[value='Previous Statement']");

  await download(page);
}

async function scrape() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  // await page._client.send('Page.setDownloadBehavior', {behavior: 'allow', downloadPath: './'})

  await page.goto(
    "https://www.business.hsbc.co.uk/1/2/online-services/accounts/account-list",
    { waitUntil: "networkidle2" }
  );

  console.log("submitting username...");
  await page.waitFor("input[name=userid]");
  await page.type("input[name=userid]", process.env.USERNAME);
  await page.screenshot({path: 'a.png'});
  await page.click('input[type="submit"]');

  console.log("submitting password and SECURE_CODE...");
  await page.screenshot({path: 'a1.png'});
  await page.waitFor("input[name=memorableAnswer]");
  await page.waitFor("input[name=idv_OtpCredential]");
  await page.type("input[name=memorableAnswer]", process.env.PASSWORD);
  await page.type("input[name=idv_OtpCredential]", process.env.SECURE_CODE);
  // await page.screenshot({path: 'b.png'});
  await page.click('input[type="submit"]');

  console.log("selecting default account...");

  await page.waitForNavigation({ waitUntil: "networkidle2" });

  if (
    await page.evaluate(() => !document.querySelector("a[title~='Statements']"))
  ) {
    console.log("selecting account")
    await page.click("a.jhxCursorHand");
  }

  await page.screenshot({path: 'b.png'});

  console.log("clicking statements...");

  await page.waitFor("a[title~='Statements']");
  await page.screenshot({path: 'c.png'});
  await page.click("a[title~='Statements']");

  console.log("view statements...");

  await page.waitFor("input.BIBHistStmts-no-js-show");
  // await page.screenshot({path: 'd.png'});
  await page.click("input.BIBHistStmts-no-js-show");

  console.log("opening select statement page...");

  await page.waitFor("input[name=cmd_transactions]");
  // await page.screenshot({path: 'e.png'});
  await page.click("input[name=cmd_transactions]");

  console.log("opening specific statement page...");

  // await page.screenshot({path: 'f.png'});
  await download(page);

  await browser.close();
}

scrape();
