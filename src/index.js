const { LemmyHttp } = require("lemmy-js-client");

const localUrl = process.env.LOCAL_URL;
const localUsername = process.env.LOCAL_USERNAME;
const localPassword = process.env.LOCAL_PASSWORD;

// List from https://github.com/maltfield/awesome-lemmy-instances
const remoteInstances = JSON.parse(process.env.REMOTE_INSTANCES);

const postCount = parseInt(process.env.POST_COUNT);
const communityCount = parseInt(process.env.COMMUNITY_COUNT);
// https://github.com/LemmyNet/lemmy-js-client/blob/main/src/types/SortType.ts
// https://join-lemmy.org/docs/users/03-votes-and-ranking.html
const communitySortMethods = JSON.parse(process.env.COMMUNITY_SORT_METHODS);
const communityType = process.env.COMMUNITY_TYPE;
const ignore = process.env.IGNORE ? JSON.parse(process.env.IGNORE) : [];
const secondsAfterCommunityAdd = parseInt(
  process.env.SECONDS_AFTER_COMMUNITY_ADD
);
const minutesBetweenRuns = parseInt(process.env.MINUTES_BETWEEN_RUNS);
const nsfw = process.env.NSFW ? JSON.parse(process.env.NSFW) : false;

function sleep(s) {
  return new Promise((resolve) => setTimeout(resolve, s * 1000));
}

async function check(localClient, user, items) {
  const searched = [];
  for await (const item of items) {
    try {
      if (!item.community.deleted) {
        if (nsfw || !item.community.nsfw) {
          let existingCommunity;
          const communityInstance = item.community.actor_id.split("/")[2];
          const community = `${item.community.name}@${communityInstance}`;

          if (!ignore.some((v) => community.includes(v))) {
            if (!searched.includes(community)) {
              try {
                existingCommunity = await localClient.getCommunity({
                  name: `${community}`,
                });
                console.log(`Searched for community ${community}: found`);
              } catch (e) {
                console.log(`Searched for community ${community}: ${e}`);
              }

              try {
                // If the community is not found on the local instance add it and follow it
                if (!existingCommunity) {
                  let newCommunity = await localClient.resolveObject({
                    q: item.community.actor_id,
                    auth: user.jwt,
                  });
                  console.log(
                    `Added community ${community}: ${newCommunity.community.community.id}`
                  );

                  console.log(`Sleeping ${secondsAfterCommunityAdd} seconds`);
                  await sleep(secondsAfterCommunityAdd);

                  await localClient.followCommunity({
                    community_id: newCommunity.community.community.id,
                    follow: true,
                  });
                  console.log(
                    `Followed community ${community}: ${newCommunity.community.community.id}`
                  );
                }
                searched.push(`${community}`);
              } catch (e) {
                console.log(`Couldn't add community ${community}: ${e}`);
              }
            }
          } else {
            console.log(`Ignoring community ${community}`);
          }
        }
      }
    } catch (e) {
      console.log(e);
    }
  }
}

async function subscribeAll(localClient, user) {
  let page = 0;
  let loops = 0;

  while (loops < 500) {
    try {
      let response = await localClient.listCommunities({
        type_: communityType,
        sort: "Old",
        page: page,
        limit: 50,
        auth: user.jwt,
      });

      if (!response.communities || response.communities.length == 0) {
        break;
      }

      for await (const c of response.communities) {
        if (
          c.subscribed == "NotSubscribed" &&
          !c.blocked &&
          !c.community.removed &&
          !c.community.deleted
        ) {
          if (nsfw || !c.community.nsfw) {
            console.log(`Subscribing to ${c.community.actor_id}`);
            await localClient.followCommunity({
              community_id: c.community.id,
              follow: true,
            });
          } else {
            console.log(`Already subscribed to ${c.community.actor_id}`);
          }
        }

        if (
          c.subscribed != "NotSubscribed" &&
          (c.blocked || c.community.removed || c.community.deleted)
        ) {
          console.log(`Unsubscribing from ${c.community.actor_id}`);
          await localClient.followCommunity({
            community_id: c.community.id,
            follow: false,
            auth: user.jwt,
          });
        }

        if (c.subscribed != "NotSubscribed" && !nsfw && c.community.nsfw) {
          console.log(`Unsubscribing from ${c.community.actor_id}`);
          await localClient.followCommunity({
            community_id: c.community.id,
            follow: false,
            auth: user.jwt,
          });
        }
      }
    } catch (e) {
      console.log(e);
    }
    page++;
    loops++;
  }
}

async function main() {
  while (true) {
    try {
      let localClient = new LemmyHttp(localUrl);
      let loginForm = {
        username_or_email: localUsername,
        password: localPassword,
      };
      let user = await localClient.login(loginForm);
      localClient.setHeaders({ Authorization: "Bearer " + user.jwt });

      for await (const remoteInstance of remoteInstances) {
        try {
          for await (const communitySortMethod of communitySortMethods) {
            let remoteClient = new LemmyHttp(`https://${remoteInstance}`);
            console.log(
              `Checking ${remoteInstance} for posts of ${communitySortMethod}`
            );

            let response = await remoteClient.getPosts({
              type_: communityType,
              sort: communitySortMethod,
              page: 0,
              limit: postCount,
            });

            await check(localClient, user, response.posts);
            console.log(
              `Checking ${remoteInstance} for communities of ${communitySortMethod}`
            );
            response = await remoteClient.listCommunities({
              type_: communityType,
              sort: communitySortMethod,
              limit: communityCount,
            });

            console.log("Response from communities:", response);

            await check(localClient, user, response.communities);
          }
        } catch (e) {
          console.log(e);
        }
      }
      await subscribeAll(localClient, user);
    } catch (e) {
      console.log(e);
    }
    console.log(`Sleeping ${minutesBetweenRuns} minutes`);
    await sleep(minutesBetweenRuns * 60);
  }
}

main();
