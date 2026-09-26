import {defineArrayMember, defineField, defineType} from 'sanity'
import {UsersIcon} from '@sanity/icons/Users'

/** A debate team. Everyone on it is equal, and anyone on it can share the invite link. */
export const team = defineType({
  name: 'team',
  title: 'Team',
  type: 'document',
  icon: UsersIcon,
  liveEdit: true,
  fields: [
    defineField({name: 'name', type: 'string', validation: (rule) => rule.required().max(60)}),
    defineField({
      name: 'members',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'member'}], weak: true})],
    }),
    defineField({
      name: 'inviteCode',
      description: 'Part of the invite link. Anyone on the team can make a new one.',
      type: 'string',
      readOnly: true,
    }),
  ],
  preview: {
    select: {title: 'name', members: 'members'},
    prepare: ({title, members}) => ({
      title,
      subtitle: `${members?.length ?? 0} member${members?.length === 1 ? '' : 's'}`,
    }),
  },
})
