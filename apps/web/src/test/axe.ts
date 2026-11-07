import axe from 'axe-core'

// Tags covering WCAG 2.0, 2.1 and 2.2 up to conformance level AA. Level A rules
// are included because AA conformance requires satisfying them too.
export const wcagAATags = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
]

// jsdom does not load the Tailwind stylesheet nor compute layout, so axe cannot
// evaluate color contrast here. That criterion (1.4.3 / 1.4.11) needs a real
// browser and is left out of these tests.
const rules = { 'color-contrast': { enabled: false } }

// Runs axe against the rendered DOM and returns one readable line per problem,
// so a failing test lists the violations instead of printing a raw object.
export async function findWcagAAViolations(
  context: Element = document.body,
): Promise<string[]> {
  const { violations } = await axe.run(context, {
    runOnly: { type: 'tag', values: wcagAATags },
    rules,
  })

  return violations.flatMap((violation) =>
    violation.nodes.map(
      (node) =>
        `[${violation.id}] (${violation.impact}) ${violation.help}: ${node.target.join(' ')} — ${violation.helpUrl}`,
    ),
  )
}
