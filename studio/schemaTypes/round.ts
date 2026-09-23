import {defineArrayMember, defineField, defineType} from 'sanity'
import {MicrophoneIcon} from '@sanity/icons/Microphone'
import {ROUND_WORKFLOW_ID} from '../../shared/workflow'
import {WorkflowStateInput} from '../workflow/WorkflowStateInput'

export const round = defineType({
  name: 'round',
  title: 'Round',
  type: 'document',
  icon: MicrophoneIcon,
  // Rounds are changed live by the chat, the workflow and the agent, so they skip drafts.
  liveEdit: true,
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      description: 'For example "Round 3 – Aff vs. Lincoln".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'workflowState',
      title: 'Workflow state',
      description: 'Changed only through workflow moves, using the buttons below.',
      type: 'string',
      readOnly: true,
      components: {input: WorkflowStateInput},
    }),
    defineField({
      name: 'speeches',
      title: 'Speech tabs',
      description:
        'Each speech is a tab in the chat. Messages sent in a tab belong to that speech.',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'speech',
          type: 'object',
          fields: [
            defineField({name: 'name', type: 'string', validation: (rule) => rule.required()}),
          ],
          preview: {select: {title: 'name'}},
        }),
      ],
    }),
    defineField({
      name: 'workflowHistory',
      title: 'Workflow history',
      type: 'array',
      readOnly: true,
      of: [
        defineArrayMember({
          name: 'workflowEvent',
          type: 'object',
          fields: [
            defineField({name: 'transition', type: 'string'}),
            defineField({name: 'from', type: 'string'}),
            defineField({name: 'to', type: 'string'}),
            defineField({
              name: 'actorType',
              type: 'string',
              options: {list: ['agent', 'person']},
            }),
            defineField({name: 'actorName', type: 'string'}),
            defineField({name: 'at', type: 'datetime'}),
          ],
          preview: {
            select: {
              transition: 'transition',
              actorType: 'actorType',
              actorName: 'actorName',
              at: 'at',
            },
            prepare: ({transition, actorType, actorName, at}) => ({
              title: `${transition} by ${actorName ?? 'unknown'} (${actorType})`,
              subtitle: at ? new Date(at).toLocaleString() : undefined,
            }),
          },
        }),
      ],
    }),
  ],
  initialValue: async (_params, {getClient}) => {
    const client = getClient({apiVersion: '2026-09-22'})
    const initialState = await client.fetch<string | null>(`*[_id == $id][0].initialState`, {
      id: ROUND_WORKFLOW_ID,
    })
    return {workflowState: initialState ?? 'draft', speeches: []}
  },
  preview: {
    select: {title: 'title', state: 'workflowState'},
    prepare: ({title, state}) => ({title, subtitle: state}),
  },
})
