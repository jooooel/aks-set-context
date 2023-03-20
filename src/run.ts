import * as core from '@actions/core'
import * as io from '@actions/io'
import * as exec from '@actions/exec'
import * as path from 'path'
import * as fs from 'fs'
import * as crypto from 'crypto'

const AZ_TOOL_NAME = 'az'
const KUBELOGIN_TOOL_NAME = 'kubelogin'
const ACTION_NAME = 'Azure/aks-set-context'
const AZ_USER_AGENT_ENV = 'AZURE_HTTP_USER_AGENT'
const AZ_USER_AGENT_ENV_PS = 'AZUREPS_HOST_ENVIRONMENT'

export async function run() {
   const originalAzUserAgent = process.env[AZ_USER_AGENT_ENV] || ''
   const originalAzUserAgentPs = process.env[AZ_USER_AGENT_ENV_PS] || ''

   // use try finally to always unset temp user agent
   try {
      // set az user agent
      core.exportVariable(AZ_USER_AGENT_ENV, getUserAgent(originalAzUserAgent))
      core.exportVariable(
         AZ_USER_AGENT_ENV_PS,
         getUserAgent(originalAzUserAgentPs)
      )

      // get inputs
      const resourceGroupName = core.getInput('resource-group', {
         required: true
      })
      const clusterName = core.getInput('cluster-name', {required: true})
      const subscription = core.getInput('subscription') || ''
      const adminInput = core.getInput('admin') || ''
      const admin = adminInput.toLowerCase() === 'true'
      const useKubeLoginInput = core.getInput('use-kubelogin') || ''
      const useKubeLogin = useKubeLoginInput.toLowerCase() === 'true' && !admin
      const retries = +core.getInput('retries') || 0
      const retryDelay = +core.getInput('retry-delay') || 0

      // check az tools
      const azPath = await io.which(AZ_TOOL_NAME, false)
      if (!azPath)
         throw Error(
            'Az cli tools not installed. You must install them before running this action.'
         )

      // get kubeconfig
      const runnerTempDirectory = process.env['RUNNER_TEMP'] // use process.env until the core libs are updated
      const kubeconfigPath = path.join(
         runnerTempDirectory,
         `kubeconfig_${Date.now()}`
      )
      core.debug(`Writing kubeconfig to ${kubeconfigPath}`)
      const cmd = [
         'aks',
         'get-credentials',
         '--resource-group',
         resourceGroupName,
         '--name',
         clusterName,
         '-f',
         kubeconfigPath
      ]
      if (subscription) cmd.push('--subscription', subscription)
      if (admin) cmd.push('--admin')

      const exitCode = await retry(
         () => exec.exec(AZ_TOOL_NAME, cmd),
         retries,
         retryDelay
      )
      if (exitCode !== 0)
         throw Error('az cli exited with error code ' + exitCode)

      fs.chmodSync(kubeconfigPath, '600')

      // export variable
      core.exportVariable('KUBECONFIG', kubeconfigPath)
      core.debug('KUBECONFIG environment variable set')
      core.exportVariable('KUBE_CONFIG_PATH', kubeconfigPath)

      if (useKubeLogin) {
         const kubeloginCmd = ['convert-kubeconfig', '-l', 'azurecli']

         const kubeloginExitCode = await retry(
            () => exec.exec(KUBELOGIN_TOOL_NAME, kubeloginCmd),
            retries,
            retryDelay
         )
         if (kubeloginExitCode !== 0)
            throw Error('kubelogin exited with error code ' + exitCode)
      }
   } catch (e) {
      throw e
   } finally {
      core.exportVariable(AZ_USER_AGENT_ENV, originalAzUserAgent)
      core.exportVariable(AZ_USER_AGENT_ENV_PS, originalAzUserAgentPs)
   }
}

async function retry(
   action: () => Promise<number>,
   retries: number,
   retry_delay: number
): Promise<number> {
   var exitCode: number
   for (let attempt = 1; attempt <= retries + 1; attempt++) {
      const retry = attempt <= retries

      try {
         exitCode = await action()

         if (exitCode == 0 || !retry) {
            // Success or no more retries, return exit code
            return exitCode
         }

         core.warning('action failed with error code ' + exitCode)
      } catch (error) {
         if (retry) {
            core.warning('action failed with error: ' + error)
         } else {
            throw error
         }
      }

      core.info(
         'attempt ' +
            attempt +
            ' failed, retrying action in ' +
            retry_delay +
            'ms...'
      )
      await delay(retry_delay)
   }

   const errorMessage = 'az cli exited with error code ' + exitCode
   throw Error(errorMessage)
}

async function delay(ms: number) {
   return new Promise((resolve) => setTimeout(resolve, ms))
}

function getUserAgent(prevUserAgent: string): string {
   const actionName = process.env.GITHUB_ACTION_REPOSITORY || ACTION_NAME
   const runRepo = process.env.GITHUB_REPOSITORY || ''
   const runRepoHash = crypto.createHash('sha256').update(runRepo).digest('hex')
   const runId = process.env.GITHUB_RUN_ID
   const newUserAgent = `GitHubActions/${actionName}(${runRepoHash}; ${runId})`

   if (prevUserAgent) return `${prevUserAgent}+${newUserAgent}`
   return newUserAgent
}

run().catch(core.setFailed)
