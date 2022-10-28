import { enableParaBatchSync, env } from '../utils/env'
import {
  getLastCommittedParaBlock,
  getLastCommittedParaBlockBatch,
} from './io/window'
import { setupDb } from './io/db'
import { setupParentApi, setupPhalaApi } from '../utils/api'
import { walkParaBlock, walkParaBlockBatch, walkWindow } from './blob'
import logger from '../utils/logger'
import type { AnyObject } from './blob'

const start = async () => {
  await setupDb()
  await setupParentApi(env.parentChainEndpoint)
  await setupPhalaApi(env.chainEndpoint)

  let currWindowNum = -1
  let lastWindow: AnyObject = null

  let currParaBlockNum = await getLastCommittedParaBlock()
  let currParaBlockBatchNum = await getLastCommittedParaBlockBatch()

  const iteratePara = async () => {
    let currPromise: Promise<void> = Promise.resolve()

    async function* iterable(): AsyncGenerator<number, void, void> {
      while (true) {
        await currPromise
        currParaBlockNum += 1
        yield currParaBlockNum
      }
    }
    for await (const curr of iterable()) {
      currPromise = walkParaBlock(curr)
      await currPromise
    }
  }

  const iterateParaBatch = async () => {
    for (;;) {
      currParaBlockBatchNum = await walkParaBlockBatch(
        currParaBlockBatchNum + 1
      )
    }
  }

  const iterateWindow = async () => {
    let currPromise: Promise<AnyObject | null> = Promise.resolve(null)

    async function* iterable(): AsyncGenerator<number, void, void> {
      while (true) {
        await currPromise
        currWindowNum += 1
        yield currWindowNum
      }
    }
    for await (const curr of iterable()) {
      currPromise = walkWindow(curr, lastWindow)
      lastWindow = await currPromise
    }
  }

  iteratePara().catch((e) => {
    logger.error(e)
    process.exit(255)
  })

  iterateWindow().catch((e) => {
    logger.error(e)
    process.exit(255)
  })

  if (enableParaBatchSync)
    iterateParaBatch().catch((e) => {
      logger.error(e)
      process.exit(255)
    })
}

export default start
