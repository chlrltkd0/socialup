/* eslint-disable */
import { Builder, By, until, Capabilities } from 'selenium-webdriver';
import WorkLog from './WorkLog';

function sleep2(sec) {
  return new Promise(resolve => setTimeout(resolve, sec));
}

function sleep(store, sec, id) {
  let ms = sec*1000 + Math.random()*1000;
  store.dispatch('addWorkLog', new WorkLog(45, 'success', id, 'fw_wait', `wait ${Math.floor(ms)} mills`));
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadCookie(driver, cookies) {
  for (const cookie of cookies) {
    await driver.manage().addCookie(cookie);
  }
}

function checkFollowLimit(worklog, setting){
  if (worklog.follow >= setting.followLimitPerDay) {
    return false;
  }
  return true;
}

function checkLikeLimit(worklog, setting){
  if (worklog.like >= setting.followLimitPerDay) {
    return false;
  }
  return true;
}

function checkCommentLimit(worklog, setting){
  if (worklog.comment >= setting.followLimitPerDay) {
    return false;
  }
  return true;
}

function checkUnfollowLimit(worklog, setting){
  if (worklog.unfollow >= setting.followLimitPerDay) {
    return false;
  }
  return true;
}

async function clickFollow(store, driver, id) {
  try {
    await driver.findElement(By.xpath('//div[@class="bY2yH"]/button[text()="팔로우"] | //div[@class="bY2yH"]/button[text()="Follow"]')).click();
    await driver.wait(until.elementLocated(By.xpath('//div[@class="bY2yH"]/button[text()="팔로잉"] | //div[@class="bY2yH"]/button[text()="Following"]')), 5000);
    store.dispatch('plusInstagramLog', { userId: id, type: 1, });
    return true;
  } catch(e) {
    if (e.name === 'NoSuchSessionError') {
      throw {name: 'NoSuchSessionError'};
    }
    return false;
  }
}

async function clickLike(store, driver, id) {
  try {
    await driver.findElement(By.xpath('//section/span/button[span[@aria-label="좋아요"]] | //section/span/button[span[@aria-label="Like"]]')).click();
    await driver.wait(until.elementLocated(By.xpath('//section/span/button[span[@aria-label="좋아요 취소"]] | //section/span/button[span[@aria-label="Unlike"]]')), 5000);
    store.dispatch('plusInstagramLog', { userId: id, type: 2, });
    return true;
  } catch(e) {
    if (e.name === 'NoSuchSessionError') {
      throw {name: 'NoSuchSessionError'};
    }
    return false;
  }
}

async function run(driver, http, worklog, setting, instagramWork) {
  try {
    const work = { followWork: null,  likeWork: null, };
    for(let item of instagramWork) {
      if(work.followWork && work.likeWork) {
        break;
      } else if (!item.process) {
        if (!work.followWork && item.type.includes('follow')) {
          const response = await http.get(`api/instagram/work/finish/${item.id}`)
          if (response.data) {
            work.followWork = item;
          } else {
            store.dispatch('removeInstagramWork', item.id);
          }
        } else if (!work.likeWork && item.type.includes('like')) {
          const response = await http.get(`api/instagram/work/finish/${item.id}`)
          if (response.data) {
            work.likeWork = item;
          } else {
            store.dispatch('removeInstagramWork', item.id);
          }
        }
      }
    }
    if (work.followWork || work.likeWork) {
      if (work.followWork) {
        await driver.get(work.followWork.url);
        const data = await driver.executeScript('return _sharedData.entry_data.PostPage[0].graphql.shortcode_media');
        if (data.owner.followed_by_viewer === false && checkFollowLimit(worklog, setting)) {
          if (await clickFollow(store, driver, account.id)) {
            http.get(`api/instagram/work/process/${work.followWork.id}`);
            store.dispatch('processingInstagramWork', work.followWork.id);
          }
        }
      }
      if (work.likeWork) {
        await driver.get(work.likeWork.url);
        const data = await driver.executeScript('return _sharedData.entry_data.PostPage[0].graphql.shortcode_media');
        if (data.viewer_has_liked === false && checkLikeLimit(worklog, setting)) {
          if (await clickLike(store, driver, account.id)) {
            http.get(`api/instagram/work/process/${work.likeWork.id}`);
            store.dispatch('processingInstagramWork', work.likeWork.id);
          }
        }
      }
      if (viewBrowser === true) {
        driver.quit();
      }
      await sleep(store, setting.processingInterval, account.id);
    }
  } catch(e) {
    console.log(e);
    if (viewBrowser === true) {
      try { driver.quit(); } catch (e) {};
    }
  }
  return true;
}

export default run;
