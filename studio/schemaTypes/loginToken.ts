import {defineField, defineType} from 'sanity'
import {LockIcon} from '@sanity/icons/Lock'

/** A pending email sign-in link. Only the hash of the link's token is stored. */
export const loginToken = defineType({
  name: 'loginToken',
  title: 'Sign-in link',
  type: 'document',
  icon: LockIcon,
  liveEdit: true,
  readOnly: true,
  fields: [
    defineField({name: 'email', type: 'string'}),
    defineField({name: 'tokenHash', type: 'string'}),
    defineField({name: 'expiresAt', type: 'datetime'}),
    defineField({
      name: 'next',
      description: 'Where to go after signing in, like an invite link.',
      type: 'string',
    }),
  ],
  preview: {select: {title: 'email', subtitle: 'expiresAt'}},
})
