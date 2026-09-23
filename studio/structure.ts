import type {StructureResolver} from 'sanity/structure'
import {CommentIcon} from '@sanity/icons/Comment'
import {MicrophoneIcon} from '@sanity/icons/Microphone'
import {TransferIcon} from '@sanity/icons/Transfer'
import {ROUND_WORKFLOW_ID, type WorkflowDefinition} from '../shared/workflow'

export const structure: StructureResolver = (S, context) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Rounds')
        .icon(MicrophoneIcon)
        .child(async () => {
          // One list per workflow state, read from the workflow document itself.
          const definition = await context
            .getClient({apiVersion: '2026-09-22'})
            .fetch<WorkflowDefinition | null>(`*[_id == $id][0]{states}`, {id: ROUND_WORKFLOW_ID})
          return S.list()
            .title('Rounds')
            .items([
              S.documentTypeListItem('round').title('All rounds'),
              S.divider(),
              ...(definition?.states ?? []).map((state) =>
                S.listItem()
                  .id(`round-${state.id}`)
                  .title(state.title)
                  .icon(MicrophoneIcon)
                  .child(
                    S.documentTypeList('round')
                      .title(`${state.title} rounds`)
                      .filter('_type == "round" && workflowState == $state')
                      .params({state: state.id}),
                  ),
              ),
            ])
        }),
      S.documentTypeListItem('message').title('Messages').icon(CommentIcon),
      S.divider(),
      S.listItem()
        .title('Round workflow')
        .icon(TransferIcon)
        .child(S.document().schemaType('workflow').documentId(ROUND_WORKFLOW_ID)),
    ])
