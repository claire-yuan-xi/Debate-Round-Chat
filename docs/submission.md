---
title: Round Chat — a floating partner chat for debate rounds, with the round's workflow living in Sanity
published: false
tags: devchallenge, sanitychallenge, sanity, ai
---

*This is a submission for the [Sanity Challenge, Path Two: Vibe-Code Something Strange](https://dev.to/challenges/sanity-2026-09-16)*

<!-- Draft written with Claude from the session transcript. Edit it into your own voice.
     Things only you can add are marked TODO. Before publishing, make sure the GitHub repo
     exists at the URL below, because the screenshots load from it. -->

## What I Built

**Round Chat** is a tiny chat window for debate partners that floats on top of every other window during a round. When you're flowing on one tab and reading evidence on another, you can still see what your partner just sent, without switching tabs.

It does three things, on purpose:

- **Chat with your partner**, split into **speech tabs** (1AC, CX, 1NC…), so a note about the 1AC stays with the 1AC. Tabs with unread messages get a red dot.
- **A stopwatch** in the header.
- **Pop out.** One click puts the chat in an always-on-top window, using Chrome's Document Picture-in-Picture API.

Everything else is in the content model, not the UI:

- **The round's life is a workflow stored as data.** Draft → Ready → In round → Finished. An AI agent can draft a round, but only a person can approve it. The chat only opens in states the workflow marks as `chatOpen`.
- **Each round has a private join code**, so strangers can't post, even though the dataset is public.
- **Round Control**, an App SDK app, shows every round, its workflow history and its messages in real time.

It's for me and my debate partner. <!-- TODO: a sentence about your event/format and why you wanted this. -->

## Demo

**Live site:** https://debate-round-chat.vercel.app. You'll need a round's join code to get into a chat.

<!-- TODO: embed your screen recording here (YouTube/Loom link, or upload an .mp4). -->

The chat at the size of the pop-out window. The red dot on **1AC** means my partner posted there and I haven't looked yet:

![The chat at pop-out size, with a stopwatch running and an unread dot on the 1AC tab](https://raw.githubusercontent.com/claire-yuan-xi/Debate-Round-Chat/main/docs/screenshots/03-floating-chat-size.png)

Each speech tab keeps its own thread:

![The 1AC tab showing a partner's note about the plan text](https://raw.githubusercontent.com/claire-yuan-xi/Debate-Round-Chat/main/docs/screenshots/05-speech-tab.png)

Joining a round takes a name and the round's join code:

![Join screen with name and join code fields](https://raw.githubusercontent.com/claire-yuan-xi/Debate-Round-Chat/main/docs/screenshots/02-join.png)

Only rounds the workflow has opened for chat are listed:

![Home page listing the practice round, which is In round](https://raw.githubusercontent.com/claire-yuan-xi/Debate-Round-Chat/main/docs/screenshots/01-home.png)

<!-- TODO: add your own screenshots (Cmd+Shift+4, then Space to capture a window), saved into docs/screenshots/:
     06-popout.png        the pop-out chat floating over another app or tab
     07-studio-round.png  a round in the Studio: join code panel + Workflow state buttons
     08-studio-sidebar.png  Rounds → Draft / Ready / In round / Finished
     09-round-control.png Round Control with the history timeline and messages
     Then add them like the images above. -->

And the moment I like best. The agent drafts a round, then tries to approve it:

```
$ npm run agent -- draft "Practice round – Aff vs. Lincoln" "1AC,CX,1NC,CX,2AC"
Drafted round TlUHV76Gcte6LRyCkk0Cig (draft). A person has to approve it.

$ npm run agent -- move TlUHV76Gcte6LRyCkk0Cig approve
"Approve setup" can't be done by an agent.
```

## Code

{% github claire-yuan-xi/Debate-Round-Chat %}

| Folder | What's in it |
|---|---|
| [`studio/`](https://github.com/claire-yuan-xi/Debate-Round-Chat/tree/main/studio) | Sanity Studio: schemas, the sidebar built from the workflow, the Move round action and in-form workflow buttons, the join code panel, and `scripts/agent.ts` |
| [`app/`](https://github.com/claire-yuan-xi/Debate-Round-Chat/tree/main/app) | Round Control, an App SDK app |
| [`web/`](https://github.com/claire-yuan-xi/Debate-Round-Chat/tree/main/web) | The Next.js 16 chat, with the pop-out window, live updates, server actions and join code checks |
| [`shared/`](https://github.com/claire-yuan-xi/Debate-Round-Chat/tree/main/shared) | The workflow engine and join code helpers used by the Studio, the app and the agent |

## My Build Process

**Tool:** Claude Code in the Claude desktop app (Code tab), running Claude Opus 5.5, with the `sanity-best-practices` agent skill. Everything below happened in one long session, and the transcript is embedded further down.

**Stack:** a standalone Sanity Studio, an App SDK app, and a Next.js 16 site, side by side in one repo, plus a small `shared/` folder of workflow logic used by the Studio, the App SDK app and an agent script.

### 1. Setup, and a false start

I started with Sanity's own onboarding prompt ("set up Sanity using the `sanity-best-practices` skill… confirm `studio` and `web` are both in your working directory"). The folder was empty, so the agent stopped and told me, which was exactly what the prompt asked for. I scaffolded the Studio myself with `npm create sanity`. While the install was running, the agent scaffolded `web/` with `create-next-app`. A minute later I ran `create-next-app web` myself in the terminal, and it refused because the folder already existed. Nothing was overwritten, but it was a good reminder to let one of us drive at a time.

To prove the connection worked, the agent built a throwaway "challenge" schema with a list page and a detail page. The first reload didn't show my published document because of the 30-second ISR window. The second one did.

### 2. Deciding what to build

Before building anything I asked whether this chat could even do the challenge, and what I'd just set up. Then I pitched my idea: **a chat window that stays on top of my other Chrome tabs so my partner and I can talk during a debate round.** The agent pointed out that a normal web page can't float over other tabs. It suggested the **Document Picture-in-Picture API**, which lets a page pop out a small always-on-top window with any HTML in it, and which keeps the project inside "Next.js in front, Sanity behind".

It also flagged that most debate formats restrict outside communication during rounds. Live messaging is allowed where I compete, so I confirmed that and kept going.

My one real constraint was **keep the features to a bare minimum**: chat with my partner, a stopwatch, and tabs so a message can belong to a specific speech (1AC, CX, 1NC…). Everything else went into the content model instead of the UI.

### 3. The content model

| Type | Why it's shaped this way |
|---|---|
| `round` | Title, speech tabs (an array of `{_key, name}`), workflow state and workflow history. `liveEdit: true`, because chat, the workflow and the agent all change it live and drafts would just get in the way. |
| `message` | Its own document with a reference to the round and a `speechKey` pointing at a speech's `_key`, rather than an array inside the round. Two people typing at once never fight over one document, and live listeners only move small messages around. |
| `workflow` | A singleton (`workflow-round`) that *is* the process: states, which state new rounds start in, transitions, and who may take each transition (`agent`, `person` or both). Each state also has a `chatOpen` flag, so "can you chat in this state?" is data too. |
| `roundAccess` | A private companion document per round that holds its join code (see section 6). |

### 4. Workflows: the process as data

The workflow is **Draft → Ready → In round → Finished**. "Approve setup" (Draft → Ready) is person-only. Start and finish can be done by either. Reopen is person-only.

The agent wrote one small engine, `shared/workflow.ts`, that reads the workflow document and turns "take transition X as actor Y" into a patch, or into a readable refusal. Three places use it:

- **The Studio**, through a custom input and a document action.
- **Round Control**, the App SDK app.
- **An agent CLI**, `npm run agent -- draft | move | list`.

The part I like best: the agent drafted a round, then tried to approve it, and got back **"Approve setup" can't be done by an agent.** Same rules, same transitions, different actor. Then I approved it in the Studio. The website listens for changes to the round *and* to the workflow document, so the chat opens without a reload. <!-- TODO: confirm you saw this happen live, or reword. -->

**Honest limitation:** each caller *declares* whether it's an agent or a person. Nothing checks that. Enforcing it properly would need Sanity roles or a Sanity Function that validates transitions on the server. I didn't get to that.

### 5. Studio customizations

- **A sidebar built from the workflow.** One list per state, generated from the workflow document's states, so adding a state in the content adds a list in the Studio.
- **A "Move round" action and a state badge on every round.**
- **In-form workflow buttons.** This one came from a bug. I couldn't find the Move round button. The agent dug into the Studio v6 source and found that for `liveEdit` documents the footer never shows a custom action as a button; it always goes into the "⋯" menu. So it added a custom input that puts the current state and its allowed moves at the top of the form. Moving that field right under the title made it obvious.
- **Renaming a state without a migration.** The Studio showed two green/red "Live" badges: mine, and Sanity's own marker for live-edit documents. I asked for a clearer name. Only the title changed ("In round"). The state's ID stayed `live`, so no data had to be migrated.
- **A join code panel** at the top of each round (section 6).

### 6. Join codes on a public dataset

Before real use I asked for a join code so strangers can't post. The catch: **the dataset is public**, so a code stored on the round would be readable by anyone with the project ID. The agent stored each code in its own document with a dot in the ID (`roundAccess.<roundId>`). Sanity treats those as private paths that anonymous queries can't see. We checked this with an anonymous query, which returned nothing.

The website asks for the code, remembers it in an httpOnly cookie, and checks it on the server for every message and every new tab. Wrong guesses wait 800 ms. **New code** in the Studio signs everyone out.

**Honest limitation:** the code stops strangers from *posting* and hides the chat on the site, but messages themselves are still readable through the public API. Making the dataset private would mean routing live updates through the Next.js server instead of straight from Sanity to the browser. That's the next thing I'd change.

### 7. App SDK: Round Control

`app/` is a custom React app on the App SDK that runs inside the Sanity dashboard:

- a real-time list of rounds with their states;
- the same workflow buttons as the Studio, acting as the logged-in person;
- a timeline of every transition, with who made it (agent or person);
- every message in the round, labeled by speech tab, updating live.

It uses `useDocuments` and `useDocumentProjection` for lists, `useDocument` for the round, and `useApplyDocumentActions` with `editDocument` on a `liveEdit` handle for transitions. The scaffold's `node_modules` came out corrupted: TypeScript crashed with "Unexpected end of input" inside its own compiler. A clean reinstall fixed it. The first scaffold command also failed on a flag (`--skip-mcp`) that the current CLI doesn't have, so the agent read `--help` and used `--no-mcp`.

To share `shared/workflow.ts` between packages without a monorepo tool, the Studio and the app each allow Vite to read one folder up (`server.fs.allow: ['..']`).

### 8. The chat itself

The Next.js side stays deliberately small:

- **Live updates** come from `client.listen()` in the browser. Any change to the round, its messages or the workflow triggers a refetch.
- **Writes** go through server actions with a server-only token, so the token never reaches the browser.
- **Pop-out**: "Pop out chat" calls `documentPictureInPicture.requestWindow()`, copies the page's styles into the new window, and renders the chat there with a React portal. State lives in the parent component, so the stopwatch and the message you're typing survive popping in and out.
- **Unread dots** mark speech tabs with messages from your partner that you haven't seen.

Things that went wrong here:

- **The pop-out failed** in the agent's built-in browser ("no window"), because that browser won't open extra windows. <!-- TODO: say how it went in real Chrome. --> The agent added a visible error instead of a silent failure.
- **React's lint rules** rejected setting state inside effects, three times. The fixes were better code: `useSyncExternalStore` for the saved name and feature detection, and computing the active tab instead of syncing it.
- **A GROQ scope bug.** `^.^.workflowState` returned `null`. The agent tested variants against the live API and found that array filters inside a subquery don't add a scope level, so the correct form is `^.workflowState`.

### 9. Deploying

- **Studio:** `sanity deploy` → https://debate-round-chat.sanity.studio
- **Round Control:** `sanity deploy --create` → in the Sanity dashboard.
- **Website: Vercel.** The first deploy built fine, but every page returned **404**. `vercel link` had created the project with the "Other" framework preset. A one-line `vercel.json` (`"framework": "nextjs"`) fixed it.

### 10. Security mistakes, fixed

While checking on my Vercel login, the agent read my terminal, and my Sanity write token from earlier was still on screen. It told me right away that the token was now in the transcript. I created a new token, added it to Vercel as a Secret, and deleted the old one. The agent then checked with a dry-run write that the new token works and the old one is rejected (401). The token in the embedded transcript below is dead.

The agent also left a few things to me on purpose:

- Deleting my old test document: it gave me the command to run.
- Entering tokens into Vercel.
- Logging in for me.
- Clicking "Approve" while it was testing in the Studio. The workflow says a person approves, and the click would have been logged under my name.

It slowed things down a little, but it's the right call for a tool that can act on your accounts.

### 11. A bug the screenshots caught

Taking the screenshots for this post turned up an empty grey bubble in the chat. It was a real `message` document with no author, text or time. It had been created from the Studio's "New document" button, and because messages save instantly, an empty one was saved on the spot. The fix had three parts:

- The website skips messages without text or a send time.
- Round Control does the same.
- The Studio no longer offers "create message", since messages should only come from the chat.

### Prompts that worked, and ones that didn't

Quoted as I typed them, typos included.

**Worked: asking before building.**
> without doing what the prompt says, just answer: do you think in this chat i can have u do this prompt from the dev-challenge sanity challenge with the stuff we have set up here? im not sure what this stuff i just set up and did actually does, so provide context on that as well.

I got a plain-English tour of what I'd set up (Studio vs. website vs. TypeGen), a "yes, and here's how" for the challenge, and the Picture-in-Picture idea, all before any code was written.

**Worked: tight scope, spelled out.**
> use document picture in picture, and it can have that extra functionality u mention but actually keep the number of functions to a bare minimum; just the ability to chat with the partner during the round, maybe a stop watch, and the ability to create subtabs so a message can be tied to a specific speech. […] now start building studio custommizations, an app sdk app and a workflow schema.

This one prompt produced most of the project. Naming the three features kept the UI small, and naming the three Sanity areas pushed the depth into the content model.

**Worked: short follow-ups with one clear goal.**
> rename the round state to something clearer

> yes commit it, then add the join code

**Didn't work at first: describing the UI in words.**
> where is the move round button within the studio, there is none

> wheres the pop out chat

The first needed the agent to open the Studio itself and dig into Studio v6's source to find where the button went. The second was a mix-up: I was looking in the Studio, and the chat lives on the website. Sending a **screenshot** settled it in one reply. Next time I'd send the screenshot first.

**Didn't work: running my own commands alongside the agent's.**
Running `create-next-app web` myself after the agent already had caused a conflict, and so did an old Studio server still holding port 3333. Clicking "Run" on a `git push` command four times opened four terminals, all waiting for a password. We eventually switched to an SSH key.

<!-- TODO: add anything from your side — how it felt in an actual round, what your partner thought, what you'd build next. -->

## Sanity Project Details

- **Project ID:** `jelfmjhs`
- **Dataset:** `production` (public)
- **Studio:** https://debate-round-chat.sanity.studio

You can read the content model straight from the public API:

- [The round workflow document](https://jelfmjhs.api.sanity.io/v2026-09-22/data/query/production?query=*%5B_id%20%3D%3D%20%22workflow-round%22%5D%5B0%5D%7Btitle%2C%20initialState%2C%20states%5B%5D%7Bid%2C%20title%2C%20chatOpen%7D%2C%20transitions%5B%5D%7Bid%2C%20title%2C%20from%2C%20to%2C%20actors%7D%7D): its states, transitions and who is allowed to take each one.
- [Rounds with their speech tabs and workflow history](https://jelfmjhs.api.sanity.io/v2026-09-22/data/query/production?query=*%5B_type%20%3D%3D%20%22round%22%5D%7Btitle%2C%20workflowState%2C%20speeches%5B%5D%7Bname%7D%2C%20workflowHistory%5B%5D%7Btransition%2C%20actorType%2C%20at%7D%7D), including which transitions an agent made and which a person made.

| Type | Role |
|---|---|
| `round` | Live-edit. Title, speech tabs, `workflowState` and `workflowHistory` |
| `message` | Live-edit. Reference to its round, `speechKey`, author, body, `sentAt` |
| `workflow` | Singleton `workflow-round`: states (with `chatOpen`), `initialState`, and transitions with allowed actors |
| `roundAccess` | Private `roundAccess.<roundId>` document holding the join code. Not visible to anonymous readers |

## Agent Session

<!-- TODO: upload the transcript at https://dev.to/agent_sessions/new, slice it to the good parts, click Make Public, then embed it here.
     The Sanity token that appears in the transcript was revoked and replaced, and the agent confirmed the old one is rejected (401).
     Also check the transcript for anything else you don't want public, like your email address. -->
