import { defineQuery } from "next-sanity";

export const CHAT_OPEN_STATES_QUERY = defineQuery(
  `*[_id == "workflow-round"][0].states[chatOpen == true].id`
);

export const OPEN_ROUNDS_QUERY = defineQuery(
  `*[_type == "round" && workflowState in *[_id == "workflow-round"][0].states[chatOpen == true].id]
    | order(_updatedAt desc){
      _id, title,
      "stateTitle": *[_id == "workflow-round"][0].states[id == ^.workflowState][0].title
    }`
);

export const ROUND_QUERY = defineQuery(
  `*[_type == "round" && _id == $id][0]{
    _id, title, workflowState, speeches[]{ _key, name },
    "stateTitle": *[_id == "workflow-round"][0].states[id == ^.workflowState][0].title,
    "chatOpen": workflowState in *[_id == "workflow-round"][0].states[chatOpen == true].id
  }`
);

export const MESSAGES_QUERY = defineQuery(
  `*[_type == "message" && round._ref == $id && defined(body) && defined(sentAt)] | order(sentAt asc){ _id, author, body, sentAt, speechKey }`
);

// Only readable with a token: the access document's ID contains a dot.
export const ROUND_JOIN_CODE_QUERY = defineQuery(`*[_id == $accessId][0].joinCode`);
