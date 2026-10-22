import { defineQuery } from "next-sanity";

export const WORKFLOW_QUERY = defineQuery(
  `*[_id == "workflow-round"][0]{ initialState, states, transitions }`
);

export const MEMBER_QUERY = defineQuery(`*[_type == "member" && _id == $id][0]{ _id, name, email }`);

export const MEMBER_BY_EMAIL_QUERY = defineQuery(
  `*[_type == "member" && email == $email][0]{ _id, name }`
);

export const LOGIN_TOKEN_QUERY = defineQuery(
  `*[_type == "loginToken" && tokenHash == $tokenHash][0]{ _id, email, expiresAt, next }`
);

export const RECENT_LOGIN_TOKENS_QUERY = defineQuery(
  `count(*[_type == "loginToken" && email == $email && _createdAt > $since])`
);

export const MY_TEAMS_QUERY = defineQuery(
  `*[_type == "team" && $memberId in members[]._ref] | order(name asc){
    _id, name, inviteCode,
    "members": members[]->{ _id, name }
  }`
);

export const TEAM_BY_INVITE_QUERY = defineQuery(
  `*[_type == "team" && inviteCode == $code][0]{ _id, name, "memberCount": count(members) }`
);

export const MY_OPEN_ROUNDS_QUERY = defineQuery(
  `*[_type == "round" && $memberId in participants[]._ref
    && workflowState in *[_id == "workflow-round"][0].states[chatOpen == true].id]
    | order(_updatedAt desc){
      _id, title,
      "team": team->name,
      "participants": participants[]->name
    }`
);

export const ROUND_QUERY = defineQuery(
  `*[_type == "round" && _id == $id][0]{
    _id, title, workflowState,
    speeches[]{ _key, name },
    "stateTitle": *[_id == "workflow-round"][0].states[id == ^.workflowState][0].title,
    "chatOpen": workflowState in *[_id == "workflow-round"][0].states[chatOpen == true].id,
    "participants": participants[]->{ _id, name },
    "team": team->{ _id, name, "members": members[]->{ _id, name } }
  }`
);

export const ROUND_ACCESS_QUERY = defineQuery(
  `*[_type == "round" && _id == $id][0]{
    _id, _rev, workflowState,
    // Leaving or being removed from the team also closes off its rounds.
    "isParticipant": $memberId in participants[]._ref && $memberId in team->members[]._ref,
    "teamId": team._ref,
    "teamMemberIds": team->members[]._ref,
    "speechKeys": speeches[]._key,
    "chatOpen": workflowState in *[_id == "workflow-round"][0].states[chatOpen == true].id
  }`
);

export const MESSAGES_QUERY = defineQuery(
  `*[_type == "message" && round._ref == $id && defined(body) && defined(sentAt)]
    | order(sentAt asc){ _id, "authorId": author._ref, authorName, body, sentAt, speechKey }`
);
