import {Stack} from '@sanity/ui'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'
import {JoinCodePanel} from './access/JoinCodePanel'
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
    // The workflow is edited from the sidebar and access docs from their round, never created directly.
    templates: (templates) =>
      templates.filter((t) => !['workflow', 'roundAccess'].includes(t.schemaType)),
  },

  form: {
    components: {
      // Put the join code at the top of every round's form.
      input: (props) =>
        props.id === 'root' && props.schemaType.name === 'round' ? (
          <Stack gap={5}>
            <JoinCodePanel />
            {props.renderDefault(props)}
          </Stack>
        ) : (
          props.renderDefault(props)
        ),
    },
  },

  document: {
    actions: (prev, context) =>
      context.schemaType === 'round' ? [MoveRoundAction, ...prev] : prev,
    badges: (prev, context) =>
      context.schemaType === 'round' ? [WorkflowStateBadge, ...prev] : prev,
  },
})
