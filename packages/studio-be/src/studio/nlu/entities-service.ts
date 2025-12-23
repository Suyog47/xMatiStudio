import * as sdk from 'botpress/sdk'
import { getEntityId } from 'common/entity-id'
import { GhostService } from 'core/bpfs'
import { sanitizeFileName } from 'core/misc/utils'
import * as CacheManager from './cache-manager'
import { CUSTOM_PATTERN_ENTITIES } from './custom-pattern-entities'
import { NLUService } from './nlu-service'

const ENTITIES_DIR = './entities'

// System entities (non-editable)
const getSystemEntities = (): sdk.NLU.EntityDefinition[] => {
  // Only return 'any' as system entity
  // Custom pattern entities are now regular pattern entities (editable)
  const anyEntity: sdk.NLU.EntityDefinition = {
    name: 'any',
    type: 'system',
    id: getEntityId('any')
  }
  return [anyEntity]
}

export class EntityService {
  constructor(private ghostService: GhostService, private nluService: NLUService) {}

  private entityExists(botId: string, entityName: string): Promise<boolean> {
    return this.ghostService.forBot(botId).fileExists(ENTITIES_DIR, `${entityName}.json`)
  }

  public async getCustomEntities(botId: string): Promise<sdk.NLU.EntityDefinition[]> {
    const intentNames = await this.ghostService.forBot(botId).directoryListing(ENTITIES_DIR, '*.json')
    return Promise.mapSeries(intentNames, (n) => this.getEntity(botId, n))
  }

  public async listEntities(botId: string): Promise<sdk.NLU.EntityDefinition[]> {
    const systemEntities = getSystemEntities()
    const customEntities = await this.getCustomEntities(botId)

    // Combine and deduplicate by entity name
    const allEntities = [...systemEntities, ...customEntities]
    const uniqueEntities = allEntities.filter((entity, index, self) =>
      index === self.findIndex((e) => e.name === entity.name)
    )

    return uniqueEntities
  }

  public async getEntity(botId: string, entityName: string): Promise<sdk.NLU.EntityDefinition> {
    entityName = sanitizeFileName(entityName)

    if (!(await this.entityExists(botId, entityName))) {
      throw new Error('Entity does not exist')
    }
    return this.ghostService.forBot(botId).readFileAsObject(ENTITIES_DIR, `${entityName}.json`)
  }

  public async deleteEntity(botId: string, entityName: string): Promise<void> {
    const nameSanitized = sanitizeFileName(entityName)
    if (!(await this.entityExists(botId, nameSanitized))) {
      throw new Error('Entity does not exist')
    }

    CacheManager.deleteCache(entityName, botId)
    return this.ghostService.forBot(botId).deleteFile(ENTITIES_DIR, `${nameSanitized}.json`)
  }

  public async saveEntity(botId: string, entity: sdk.NLU.EntityDefinition): Promise<void> {
    const nameSanitized = sanitizeFileName(entity.name)
    return this.ghostService
      .forBot(botId)
      .upsertFile(ENTITIES_DIR, `${nameSanitized}.json`, JSON.stringify(entity, undefined, 2))
  }

  /**
   * Initialize custom pattern entities for a bot
   * This ensures the NLU server can access these entities during training
   */
  public async initializeCustomPatternEntities(botId: string): Promise<void> {
    for (const entity of CUSTOM_PATTERN_ENTITIES) {
      const entityExists = await this.entityExists(botId, entity.name)
      if (!entityExists) {
        await this.saveEntity(botId, entity)
      }
    }
  }

  public async updateEntity(botId: string, targetEntityName: string, entity: sdk.NLU.EntityDefinition): Promise<void> {
    const nameSanitized = sanitizeFileName(entity.name)
    const targetSanitized = sanitizeFileName(targetEntityName)

    if (targetSanitized !== nameSanitized) {
      // entity renamed
      CacheManager.copyCache(targetEntityName, entity.name, botId)
      await Promise.all([
        this.deleteEntity(botId, targetSanitized),
        this.nluService.intents.updateIntentsSlotsEntities(botId, targetSanitized, nameSanitized)
      ])
    } else {
      // entity changed
      CacheManager.getOrCreateCache(targetEntityName, botId).reset()
    }
    await this.saveEntity(botId, entity)
  }
}
