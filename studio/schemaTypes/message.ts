import {defineField, defineType} from 'sanity'
import {CommentIcon} from '@sanity/icons/Comment'

export const message = defineType({
  name: 'message',
  title: 'Message',
  type: 'document',
  icon: CommentIcon,
  // Messages are written by the chat as they're sent, never drafted.
  liveEdit: true,
  fields: [
    defineField({
      name: 'round',
      type: 'reference',
      to: [{type: 'round'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'speechKey',
      title: 'Speech tab',
      description: 'The _key of the speech in the round. Empty means the General tab.',
      type: 'string',
    }),
    defineField({name: 'author', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'body',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required().max(2000),
    }),
    defineField({name: 'sentAt', type: 'datetime', validation: (rule) => rule.required()}),
  ],
  orderings: [
    {title: 'Sent, newest first', name: 'sentAtDesc', by: [{field: 'sentAt', direction: 'desc'}]},
  ],
  preview: {
    select: {author: 'author', body: 'body', round: 'round.title'},
    prepare: ({author, body, round}) => ({title: `${author}: ${body}`, subtitle: round}),
  },
})
