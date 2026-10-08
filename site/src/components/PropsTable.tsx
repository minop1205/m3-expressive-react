import React from 'react'
import props from '../props/props.json'

interface Entry {
  description: string
  props: {
    name: string
    type: string
    required: boolean
    defaultValue: string | null
    description: string
  }[]
}

/**
 * Renders the inline Markdown that JSDoc descriptions use — `code` and
 * **bold** — instead of printing the backticks / asterisks literally.
 * Line breaks inside a description are soft wraps and collapse as in HTML.
 */
function InlineMarkdown({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          return <code key={i}>{part.slice(1, -1)}</code>
        }
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return <strong key={i}>{part.slice(2, -2)}</strong>
        }
        return part
      })}
    </>
  )
}

/** Auto-generated prop table (see scripts/gen-props.mjs). */
export default function PropsTable({ component }: { component: string }) {
  const entry = (props as Record<string, Entry>)[component]
  if (!entry) return <p>No prop documentation found for “{component}”.</p>
  return (
    <table>
      <thead>
        <tr>
          <th>Prop</th>
          <th>Type</th>
          <th>Default</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {entry.props.map((p) => (
          <tr key={p.name}>
            <td>
              <code>{p.name}</code>
              {p.required ? <strong title="required"> *</strong> : null}
            </td>
            <td>
              <code>{p.type}</code>
            </td>
            <td>{p.defaultValue != null ? <code>{p.defaultValue}</code> : '—'}</td>
            <td>
              <InlineMarkdown text={p.description} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
