import {defineField, defineType} from 'sanity'
import {UserIcon} from '@sanity/icons/User'

/** A debater who signed in with an email link. */
export const member = defineType({
  name: 'member',
  title: 'Member',
  type: 'document',
  icon: UserIcon,
  liveEdit: true,
  fields: [
    defineField({
      name: 'name',
      description: 'What teammates see in the chat.',
      type: 'string',
      validation: (rule) => rule.max(40),
    }),
    defineField({
      name: 'email',
      description: 'Stored lowercase. Sign-in links go here.',
      type: 'string',
      readOnly: true,
      validation: (rule) => rule.required().email(),
    }),
  ],
  preview: {select: {title: 'name', subtitle: 'email'}},
})
