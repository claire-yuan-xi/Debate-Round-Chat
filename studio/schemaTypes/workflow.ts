import {defineArrayMember, defineField, defineType, type StringRule} from 'sanity'
import {TransferIcon} from '@sanity/icons/Transfer'

const idRule = (rule: StringRule) =>
  rule.required().regex(/^[a-z][a-z0-9-]*$/, {name: 'lowercase id'})

export const workflow = defineType({
  name: 'workflow',
  title: 'Workflow',
  type: 'document',
  icon: TransferIcon,
  description: 'The states a round moves through, and who is allowed to move it.',
  fields: [
    defineField({name: 'title', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'states',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'workflowStateDef',
          title: 'State',
          type: 'object',
          fields: [
            defineField({name: 'id', type: 'string', validation: idRule}),
            defineField({name: 'title', type: 'string', validation: (rule) => rule.required()}),
            defineField({
              name: 'chatOpen',
              title: 'Chat open',
              description: 'Whether partners can send messages and add speech tabs in this state.',
              type: 'boolean',
              initialValue: false,
            }),
          ],
          preview: {select: {title: 'title', subtitle: 'id'}},
        }),
      ],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'initialState',
      description: 'The state new rounds start in. Must match a state id.',
      type: 'string',
      validation: (rule) =>
        rule.required().custom((value, context) => {
          const states = (context.document?.states as {id?: string}[] | undefined) ?? []
          return states.some((s) => s.id === value) || 'Must match one of the state ids'
        }),
    }),
    defineField({
      name: 'transitions',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'workflowTransitionDef',
          title: 'Transition',
          type: 'object',
          fields: [
            defineField({name: 'id', type: 'string', validation: idRule}),
            defineField({name: 'title', type: 'string', validation: (rule) => rule.required()}),
            defineField({name: 'from', type: 'string', validation: (rule) => rule.required()}),
            defineField({name: 'to', type: 'string', validation: (rule) => rule.required()}),
            defineField({
              name: 'actors',
              description: 'Who may take this transition.',
              type: 'array',
              of: [defineArrayMember({type: 'string'})],
              options: {
                list: [
                  {title: 'Agent', value: 'agent'},
                  {title: 'Person', value: 'person'},
                ],
              },
              validation: (rule) => rule.required().min(1),
            }),
          ],
          preview: {
            select: {title: 'title', from: 'from', to: 'to', actors: 'actors'},
            prepare: ({title, from, to, actors}) => ({
              title,
              subtitle: `${from} → ${to} · ${(actors ?? []).join(', ')}`,
            }),
          },
        }),
      ],
    }),
  ],
})
