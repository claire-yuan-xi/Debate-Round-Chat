import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'
import {MoveRoundAction} from './workflow/MoveRoundAction'
import {WorkflowStateBadge} from './workflow/WorkflowStateBadge'

export default defineConfig({
  name: 'default',
  title: 'DEV Challenges',

  projectId: 'jelfmjhs',
  dataset: 'production',

  plugins: [structureTool({structure}), visionTool()],

  schema: {
    types: schemaTypes,
    // The workflow is a singleton edited from the sidebar, not created from "New document".
    templates: (templates) => templates.filter((t) => t.schemaType !== 'workflow'),
  },

  document: {
    actions: (prev, context) =>
      context.schemaType === 'round' ? [MoveRoundAction, ...prev] : prev,
    badges: (prev, context) =>
      context.schemaType === 'round' ? [WorkflowStateBadge, ...prev] : prev,
  },
})
