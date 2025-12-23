import * as sdk from 'botpress/sdk'

/**
 * Custom Pattern Entities to replace Duckling system entities
 * These use regex patterns for validation instead of Duckling's rule-based extraction
 */

export const CUSTOM_PATTERN_ENTITIES: sdk.NLU.EntityDefinition[] = [
  {
    id: 'custom.email',
    name: 'custom.email',
    type: 'pattern',
    occurrences: [],
    sensitive: false,
    fuzzy: 0.8,
    pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    matchCase: false,
    examples: [
      'user@example.com',
      'john.doe@company.co.uk',
      'contact_123@domain.org'
    ]
  },
  {
    id: 'custom.phone',
    name: 'custom.phone',
    type: 'pattern',
    occurrences: [],
    sensitive: false,
    fuzzy: 0.8,
    // Matches various phone number formats: +1-234-567-8900, (123) 456-7890, 123.456.7890, etc.
    pattern: '^(?:\\+?\\d{1,3})?[-.\\s]?\\(?\\d{1,4}\\)?[-.\\s]?\\d{1,4}[-.\\s]?\\d{1,4}[-.\\s]?\\d{1,9}$',
    matchCase: false,
    examples: [
      '+1-234-567-8900',
      '(123) 456-7890',
      '123.456.7890',
      '+44 20 7123 4567',
      '9876543210'
    ]
  },
  {
    id: 'custom.url',
    name: 'custom.url',
    type: 'pattern',
    occurrences: [],
    sensitive: false,
    fuzzy: 0.8,
    // Matches HTTP/HTTPS URLs
    pattern: '^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)$',
    matchCase: false,
    examples: [
      'https://www.example.com',
      'http://example.org/path',
      'https://subdomain.example.com/path?query=1'
    ]
  },
  {
    id: 'custom.number',
    name: 'custom.number',
    type: 'pattern',
    occurrences: [],
    sensitive: false,
    fuzzy: 0.8,
    // Matches integers and decimals (positive and negative)
    pattern: '^-?\\d+(\\.\\d+)?$',
    matchCase: false,
    examples: [
      '123',
      '-456',
      '78.90',
      '-12.34'
    ]
  },
  {
    id: 'custom.date',
    name: 'custom.date',
    type: 'pattern',
    occurrences: [],
    sensitive: false,
    fuzzy: 0.8,
    // Matches common date formats: YYYY-MM-DD, DD/MM/YYYY, MM-DD-YYYY
    pattern: '^(?:\\d{4}-\\d{2}-\\d{2}|\\d{2}[/\\-]\\d{2}[/\\-]\\d{4})$',
    matchCase: false,
    examples: [
      '2025-12-22',
      '22/12/2025',
      '12-22-2025'
    ]
  },
  {
    id: 'custom.time',
    name: 'custom.time',
    type: 'pattern',
    occurrences: [],
    sensitive: false,
    fuzzy: 0.8,
    // Matches time formats: HH:MM, HH:MM:SS, with optional AM/PM
    pattern: '^(?:[01]?\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d)?(?:\\s?[AaPp][Mm])?$',
    matchCase: false,
    examples: [
      '14:30',
      '09:15:30',
      '3:45 PM',
      '11:00 am'
    ]
  },
  {
    id: 'custom.zipcode',
    name: 'custom.zipcode',
    type: 'pattern',
    occurrences: [],
    sensitive: false,
    fuzzy: 0.8,
    // Matches US ZIP codes (5 digits or 5+4 format)
    pattern: '^\\d{5}(?:-\\d{4})?$',
    matchCase: false,
    examples: [
      '12345',
      '12345-6789'
    ]
  },
  {
    id: 'custom.percentage',
    name: 'custom.percentage',
    type: 'pattern',
    occurrences: [],
    sensitive: false,
    fuzzy: 0.8,
    // Matches percentages
    pattern: '^-?\\d+(\\.\\d+)?\\s?%$',
    matchCase: false,
    examples: [
      '25%',
      '99.9%',
      '-5.5 %'
    ]
  }
]

/**
 * Get custom pattern entity by name
 */
export const getCustomPatternEntity = (name: string): sdk.NLU.EntityDefinition | undefined => {
  return CUSTOM_PATTERN_ENTITIES.find(entity => entity.name === name)
}

/**
 * Get all custom pattern entity names
 */
export const getCustomPatternEntityNames = (): string[] => {
  return CUSTOM_PATTERN_ENTITIES.map(entity => entity.name)
}
