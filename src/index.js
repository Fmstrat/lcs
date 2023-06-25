const { LemmyHttp } = require("lemmy-js-client");

const localUrl = process.env.LOCAL_URL;
const localUsername = process.env.LOCAL_USERNAME;
const localPassword = process.env.LOCAL_PASSWORD;

// List from https://github.com/maltfield/awesome-lemmy-instances
const remoteInstances = JSON.parse(process.env.REMOTE_INSTANCES)

const postCount = parseInt(process.env.POST_COUNT);
const communityCount = parseInt(process.env.COMMUNITY_COUNT);
// https://github.com/LemmyNet/lemmy-js-client/blob/main/src/types/SortType.ts
// https://join-lemmy.org/docs/users/03-votes-and-ranking.html
const communitySortMethods = JSON.parse(process.env.COMMUNITY_SORT_METHODS);
const communityType = process.env.COMMUNITY_TYPE;
const secondsAfterCommunityAdd = parseInt(process.env.SECONDS_AFTER_COMMUNITY_ADD);
const minutesBetweenRuns = parseInt(process.env.MINUTES_BETWEEN_RUNS);

function sleep(s) {
  return new Promise(resolve => setTimeout(resolve, s * 1000));
}

async function check(localClient, user, items) {
  const searched = [];
  for await (const item of items) {
    let existingCommunity;
    const communityInstance = item.community.actor_id.split('/')[2];
    const community = `${item.community.name}@${communityInstance}`;
    if (!searched.includes(community)) {
      try {
        existingCommunity = await localClient.getCommunity({
          name: `${community}`,
        });
        console.log(`Searched for community ${community}: found`);
      } catch (e) {
        console.log(`Searched for community ${community}: ${e}`);
      }
      if (!existingCommunity) {
        let newCommunity = await localClient.resolveObject({
          q: item.community.actor_id,
          auth: user.jwt,
        });
        console.log(`Added community ${community}: ${newCommunity.community.community.id}`);
        console.log(`Sleeping ${secondsAfterCommunityAdd} seconds`);
        await sleep(secondsAfterCommunityAdd);
      }
      searched.push(`${community}`)
    }
  }
}

async function main() {
  while (true) {
    let localClient = new LemmyHttp(localUrl);
    let loginForm = {
      username_or_email: localUsername,
      password: localPassword,
    };
    let user = await localClient.login(loginForm);
    for await (const remoteInstance of remoteInstances) {
      for await (const communitySortMethod of communitySortMethods) {
        let remoteClient = new LemmyHttp(`https://${remoteInstance}`);
        console.log(`Checking ${remoteInstance} for posts of ${communitySortMethod}`);
        let response = await remoteClient.getPosts({
          type_: communityType,
          sort: communitySortMethod,
          page: 0,
          limit: postCount,
        });
        await check(localClient, user, response.posts);
        console.log(`Checking ${remoteInstance} for communities of ${communitySortMethod}`);
        response = await remoteClient.listCommunities({
          type_: communityType,
          sort: communitySortMethod,
          page: 0,
          limit: communityCount,
        });
        await check(localClient, user, response.communities);
      }
    }
    console.log(`Sleeping ${minutesBetweenRuns} minutes`);
    await sleep(minutesBetweenRuns * 60);
  }

  // If we want to have the user auto-subscribe to the community
  // let follow = await localClient.followCommunity({
  //   community_id: community.community_view.community.id,
  //   follow: true,
  //   auth: user.jwt,
  // });
  // console.log(follow)
}

main();