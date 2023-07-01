# Lemmy Community Seeder (LCS)

When launching a new Lemmy instance, your **All** feed will have very little populated. Also as a small instance, new communities that crop up may never make their way to you. LCS is a tool to seed communities, so your users have something in their **All** feed, right from the start. It tells your instance to pull the top communities and the communities with the top posts from your favorite instances (and subscribe to them with the specified user).

## Usage
In docker-compose:
```yml
version: '2.1'

services:

  lcs:
    image: nowsci/lcs
    container_name: lcs
    environment:
      LOCAL_URL: https://lemmy.domain.ext
      LOCAL_USERNAME: user
      LOCAL_PASSWORD: password
      REMOTE_INSTANCES: '[
        "beehaw.org",
        "lemmy.world",
        "lemmy.ml",
        "sh.itjust.works",
        "lemmy.one" ]'
      POST_COUNT: 50
      COMMUNITY_COUNT: 50
      COMMUNITY_SORT_METHODS: '[
        "TopAll",
        "TopDay" ]'
      COMMUNITY_TYPE: All
      IGNORE: '[
        "feddit.de" ]'
      SECONDS_AFTER_COMMUNITY_ADD: 17
      MINUTES_BETWEEN_RUNS: 240
    restart: unless-stopped
```

Manually:
```bash
cd src
export LOCAL_URL=https://lemmy.domain.ext
export LOCAL_USERNAME=user
export LOCAL_PASSWORD=password
export REMOTE_INSTANCES='["beehaw.org","lemmy.world","lemmy.ml","sh.itjust.works","lemmy.one"]'
export POST_COUNT=50
export COMMUNITY_COUNT=50
export COMMUNITY_SORT_METHODS='["TopAll","TopDay"]'
export COMMUNITY_TYPE=All
export IGNORE='["feddit.de"]'
export SECONDS_AFTER_COMMUNITY_ADD=17
export MINUTES_BETWEEN_RUNS=240
npm install
npm start
```

## Variables

|Variable|Description|
|-|-|
|LOCAL_URL|The URL of your instance|
|LOCAL_USERNAME|Username of a user for your instance|
|LOCAL_PASSWORD|Password of a user for your instance|
|REMOTE_INSTANCES|An array of remote instances you would like to pull top communities from|
|POST_COUNT|The number of top posts to pull from each instance, for each sort method|
|COMMUNITY_COUNT|The number of top communities to pull from each instance, for each sort method|
|COMMUNITY_SORT_METHODS|The sort methods you would like to search by|
|COMMUNITY_TYPE|Whether to pull all communities or just local ones|
|IGNORE|If a string exists in the community name, it will be ignored|
|SECONDS_AFTER_COMMUNITY_ADD|How long to sleep after adding a new community to your instance|
|MINUTES_BETWEEN_RUNS|How long to wait between runs|