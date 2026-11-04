import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'
import {MoveRoundAction} from './workflow/MoveRoundAction'
import {WorkflowStateBadge} from './workflow/WorkflowStateBadge'

export default defineConfig({
  name: 'default',
  title: 'Sidenotes',

  projectId: 'jelfmjhs',
  dataset: 'team',

  plugins: [structureTool({structure}), visionTool()],

  schema: {
    types: schemaTypes,
    // Everything but the workflow is created by the website, which fills in who did it.
    templates: (templates) => templates.filter((t) => t.schemaType === 'round'),
  },

  document: {
    actions: (prev, context) =>
      context.schemaType === 'round' ? [MoveRoundAction, ...prev] : prev,
    badges: (prev, context) =>
      context.schemaType === 'round' ? [WorkflowStateBadge, ...prev] : prev,
  },
})
