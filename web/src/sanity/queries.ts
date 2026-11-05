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

// Every kind of open chat, newest activity first. Direct messages show up once someone says something.
export const MY_CHATS_QUERY = defineQuery(
  `*[_type == "round" && select(
    kind == "room" => $memberId in guests[].memberId && dateTime(expiresAt) > dateTime(now()),
    kind == "direct" => $memberId in participants[]._ref && count(*[_type == "message" && round._ref == ^._id]) > 0,
    $memberId in participants[]._ref && workflowState in *[_id == "workflow-round"][0].states[chatOpen == true].id
  )]{
    _id, kind, title, joinCode,
    "team": team->name,
    "participants": participants[]->{ _id, name },
    "startedIt": guests[guestId == ^.createdBy][0].memberId == $memberId,
    "lastAt": coalesce(*[_type == "message" && round._ref == ^._id] | order(sentAt desc)[0].sentAt, _createdAt)
  } | order(lastAt desc)`
);

export const END_CHAT_QUERY = defineQuery(
  `*[_type == "round" && _id == $id][0]{
    kind, workflowState, createdBy,
    "creatorMemberId": guests[guestId == ^.createdBy][0].memberId
  }`
);

export const MANAGE_QUERY = defineQuery(
  `{
    "people": *[_type == "member"] | order(lower(coalesce(name, email)) asc){
      _id, name, email,
      "groups": *[_type == "team" && ^._id in members[]._ref].name
    },
    "groups": *[_type == "team"] | order(lower(name) asc){
      _id, name,
      "memberIds": members[]._ref,
      "members": members[]->name,
      "chatCount": count(*[_type == "round" && team._ref == ^._id])
    },
    "openChats": count(*[_type == "round" && !defined(kind) && workflowState in *[_id == "workflow-round"][0].states[chatOpen == true].id]),
    "directChats": count(*[_type == "round" && kind == "direct"]),
    "temporaryChats": count(*[_type == "round" && kind == "room" && dateTime(expiresAt) > dateTime(now())])
  }`
);

export const ROUND_QUERY = defineQuery(
  `*[_type == "round" && _id == $id][0]{
    _id, kind, title, workflowState, expiresAt, joinCode, createdBy,
    speeches[]{ _key, name },
    guests[]{ guestId, name },
    "chatOpen": select(
      kind == "room" => true,
      // Direct messages go read-only once two people stop sharing a team.
      kind == "direct" => count(*[_type == "team" && ^.participants[0]._ref in members[]._ref && ^.participants[1]._ref in members[]._ref]) > 0,
      workflowState in *[_id == "workflow-round"][0].states[chatOpen == true].id
    ),
    "participants": participants[]->{ _id, name },
    "team": team->{ _id, name, "members": members[]->{ _id, name } }
  }`
);

export const ROUND_ACCESS_QUERY = defineQuery(
  `*[_type == "round" && _id == $id][0]{
    _id, _rev, kind, workflowState, createdBy,
    "isParticipant": select(
      kind == "room" => $guestId in guests[].guestId && dateTime(expiresAt) > dateTime(now()),
      kind == "direct" => $memberId in participants[]._ref,
      // Leaving or being removed from the team also closes off its rounds.
      $memberId in participants[]._ref && $memberId in team->members[]._ref
    ),
    "teamId": team._ref,
    "teamMemberIds": team->members[]._ref,
    "speechKeys": speeches[]._key,
    "chatOpen": select(
      kind == "room" => true,
      kind == "direct" => count(*[_type == "team" && ^.participants[0]._ref in members[]._ref && ^.participants[1]._ref in members[]._ref]) > 0,
      workflowState in *[_id == "workflow-round"][0].states[chatOpen == true].id
    )
  }`
);

export const MESSAGES_QUERY = defineQuery(
  `*[_type == "message" && round._ref == $id && defined(body) && defined(sentAt)]
    | order(sentAt asc){ _id, "authorId": coalesce(author._ref, guestId), authorName, body, sentAt, speechKey }`
);

export const ROOM_BY_CODE_QUERY = defineQuery(
  `*[_type == "round" && kind == "room" && joinCode == $code && dateTime(expiresAt) > dateTime(now())][0]{
    _id, title, expiresAt, guests[]{ guestId, memberId }
  }`
);

export const RECENT_ROOMS_BY_CREATOR_QUERY = defineQuery(
  `count(*[_type == "round" && kind == "room" && creatorHash == $creatorHash && _createdAt > $since])`
);

export const ACTIVE_ROOM_COUNT_QUERY = defineQuery(
  `count(*[_type == "round" && kind == "room" && dateTime(expiresAt) > dateTime(now())])`
);

export const EXPIRED_ROOMS_QUERY = defineQuery(
  `*[_type == "round" && kind == "room" && dateTime(expiresAt) <= dateTime(now())][0...50]._id`
);

export const GUEST_MESSAGE_COUNTS_QUERY = defineQuery(
  `{
    "inRoom": count(*[_type == "message" && round._ref == $id]),
    "recentFromGuest": count(*[_type == "message" && round._ref == $id && guestId == $guestId && sentAt > $since])
  }`
);
