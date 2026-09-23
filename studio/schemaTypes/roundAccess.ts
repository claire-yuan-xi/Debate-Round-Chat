import {defineField, defineType} from 'sanity'
import {LockIcon} from '@sanity/icons/Lock'

/**
 * Private companion to a round, stored at `roundAccess.<roundId>` so anonymous
 * readers of the public dataset can't see it. Edited from the round's form.
 */
export const roundAccess = defineType({
  name: 'roundAccess',
  title: 'Round access',
  type: 'document',
  icon: LockIcon,
  liveEdit: true,
  fields: [
    defineField({
      name: 'round',
      type: 'reference',
      to: [{type: 'round'}],
      // Weak, so deleting a round isn't blocked by its access document.
      weak: true,
    }),
    defineField({
      name: 'joinCode',
      type: 'string',
      validation: (rule) => rule.required().length(6),
    }),
  ],
})
