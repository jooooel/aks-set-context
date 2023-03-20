import {run} from './run'
import * as core from '@actions/core'
import * as io from '@actions/io'
import * as exec from '@actions/exec'
import * as fs from 'fs'

const resourceGroup = 'sample-rg'
const clusterName = 'sample-cluster'
const subscription = 'subscription-example'
const azPath = 'path'
const runnerTemp = 'temp'
const date = 1644272184664
// GitHub testrunner was timing out so needed to up the timeout limit
const extendedTimeout = 17500

describe('Set context', () => {
   it('throws without resource-group', async () => {
      await expect(run()).rejects.toThrow()
   })

   it(
      'throws without cluster-name',
      async () => {
         jest
            .spyOn(core, 'getInput')
            .mockImplementation((inputName, options) => {
               if (inputName == 'resource-group') return resourceGroup
            })
         await expect(run()).rejects.toThrow()
      },
      extendedTimeout
   )

   it(
      'throws without az tools',
      async () => {
         jest
            .spyOn(core, 'getInput')
            .mockImplementation((inputName, options) => {
               if (inputName == 'resource-group') return resourceGroup
               if (inputName == 'cluster-name') return clusterName
            })
         await expect(run()).rejects.toThrow()
      },
      extendedTimeout
   )

   it('gets the kubeconfig and sets the context', async () => {
      jest.spyOn(core, 'getInput').mockImplementation((inputName, options) => {
         if (inputName == 'resource-group') return resourceGroup
         if (inputName == 'cluster-name') return clusterName
      })
      jest.spyOn(io, 'which').mockImplementation(async () => azPath)
      process.env['RUNNER_TEMP'] = runnerTemp
      jest.spyOn(Date, 'now').mockImplementation(() => date)
      jest.spyOn(exec, 'exec').mockImplementation(async () => 0)
      jest.spyOn(fs, 'chmodSync').mockImplementation()
      jest.spyOn(core, 'exportVariable').mockImplementation()
      jest.spyOn(core, 'debug').mockImplementation()

      await expect(run()).resolves.not.toThrowError()
      const kubeconfigPath = `${runnerTemp}/kubeconfig_${date}`
      expect(exec.exec).toBeCalledWith('az', [
         'aks',
         'get-credentials',
         '--resource-group',
         resourceGroup,
         '--name',
         clusterName,
         '-f',
         kubeconfigPath
      ])
      expect(fs.chmodSync).toBeCalledWith(kubeconfigPath, '600')
      expect(core.exportVariable).toBeCalledWith('KUBECONFIG', kubeconfigPath)
   })

   it('gets the kubeconfig and sets the context as a non admin user', async () => {
      jest.spyOn(core, 'getInput').mockImplementation((inputName, options) => {
         if (inputName == 'resource-group') return resourceGroup
         if (inputName == 'cluster-name') return clusterName
         if (inputName == 'admin') return 'false'
         if (inputName == 'use-kubelogin') return 'true'
      })
      jest.spyOn(io, 'which').mockImplementation(async () => azPath)
      process.env['RUNNER_TEMP'] = runnerTemp
      jest.spyOn(Date, 'now').mockImplementation(() => date)
      jest.spyOn(exec, 'exec').mockImplementation(async () => 0)
      jest.spyOn(fs, 'chmodSync').mockImplementation()
      jest.spyOn(core, 'exportVariable').mockImplementation()
      jest.spyOn(core, 'debug').mockImplementation()

      const kubeconfigPath = `${runnerTemp}/kubeconfig_${date}`
      await expect(run()).resolves.not.toThrowError()
      expect(exec.exec).toHaveBeenNthCalledWith(1, 'az', [
         'aks',
         'get-credentials',
         '--resource-group',
         resourceGroup,
         '--name',
         clusterName,
         '-f',
         kubeconfigPath
      ])
      expect(exec.exec).toHaveBeenNthCalledWith(2, 'kubelogin', [
         'convert-kubeconfig',
         '-l',
         'azurecli'
      ])
      expect(fs.chmodSync).toBeCalledWith(kubeconfigPath, '600')
      expect(core.exportVariable).toBeCalledWith('KUBECONFIG', kubeconfigPath)
   })

   it('gets the kubeconfig and sets the context with subscription', async () => {
      jest.spyOn(core, 'getInput').mockImplementation((inputName, options) => {
         if (inputName == 'resource-group') return resourceGroup
         if (inputName == 'cluster-name') return clusterName
         if (inputName == 'subscription') return subscription
      })
      jest.spyOn(io, 'which').mockImplementation(async () => azPath)
      process.env['RUNNER_TEMP'] = runnerTemp
      jest.spyOn(Date, 'now').mockImplementation(() => date)
      jest.spyOn(exec, 'exec').mockImplementation(async () => 0)
      jest.spyOn(fs, 'chmodSync').mockImplementation()
      jest.spyOn(core, 'exportVariable').mockImplementation()
      jest.spyOn(core, 'debug').mockImplementation()

      await expect(run()).resolves.not.toThrowError()
      const kubeconfigPath = `${runnerTemp}/kubeconfig_${date}`
      expect(exec.exec).toBeCalledWith('az', [
         'aks',
         'get-credentials',
         '--resource-group',
         resourceGroup,
         '--name',
         clusterName,
         '-f',
         kubeconfigPath,
         '--subscription',
         subscription
      ])
      expect(fs.chmodSync).toBeCalledWith(kubeconfigPath, '600')
      expect(core.exportVariable).toBeCalledWith('KUBECONFIG', kubeconfigPath)
   })

   it('gets the kubeconfig and sets the context with admin', async () => {
      jest.spyOn(core, 'getInput').mockImplementation((inputName, options) => {
         if (inputName == 'resource-group') return resourceGroup
         if (inputName == 'cluster-name') return clusterName
         if (inputName == 'admin') return 'true'
      })
      jest.spyOn(io, 'which').mockImplementation(async () => azPath)
      process.env['RUNNER_TEMP'] = runnerTemp
      jest.spyOn(Date, 'now').mockImplementation(() => date)
      jest.spyOn(exec, 'exec').mockImplementation(async () => 0)
      jest.spyOn(fs, 'chmodSync').mockImplementation()
      jest.spyOn(core, 'exportVariable').mockImplementation()
      jest.spyOn(core, 'debug').mockImplementation()

      await expect(run()).resolves.not.toThrowError()
      const kubeconfigPath = `${runnerTemp}/kubeconfig_${date}`
      expect(exec.exec).toBeCalledWith('az', [
         'aks',
         'get-credentials',
         '--resource-group',
         resourceGroup,
         '--name',
         clusterName,
         '-f',
         kubeconfigPath,
         '--admin'
      ])
      expect(fs.chmodSync).toBeCalledWith(kubeconfigPath, '600')
      expect(core.exportVariable).toBeCalledWith('KUBECONFIG', kubeconfigPath)
   })

   it('retries getting the kubeconfig on exception', async () => {
      jest.spyOn(core, 'getInput').mockImplementation((inputName, options) => {
         if (inputName == 'resource-group') return resourceGroup
         if (inputName == 'cluster-name') return clusterName
         if (inputName == 'retries') return '1'
         if (inputName == 'retry-delay') return '0'
      })
      jest.spyOn(io, 'which').mockImplementation(async () => azPath)
      process.env['RUNNER_TEMP'] = runnerTemp
      jest.spyOn(Date, 'now').mockImplementation(() => date)
      jest
         .spyOn(exec, 'exec')
         .mockImplementationOnce(async () => {
            throw new Error('asd')
         })
         .mockImplementationOnce(async () => 0)
      jest.spyOn(fs, 'chmodSync').mockImplementation()
      jest.spyOn(core, 'exportVariable').mockImplementation()
      jest.spyOn(core, 'debug').mockImplementation()

      await expect(run()).resolves.not.toThrowError()
      expect(exec.exec).toBeCalledTimes(2)
   })

   it('retries getting the kubeconfig on unsuccessful return code', async () => {
      jest.spyOn(core, 'getInput').mockImplementation((inputName, options) => {
         if (inputName == 'resource-group') return resourceGroup
         if (inputName == 'cluster-name') return clusterName
         if (inputName == 'retries') return '1'
         if (inputName == 'retry-delay') return '0'
      })
      jest.spyOn(io, 'which').mockImplementation(async () => azPath)
      process.env['RUNNER_TEMP'] = runnerTemp
      jest.spyOn(Date, 'now').mockImplementation(() => date)
      jest
         .spyOn(exec, 'exec')
         .mockImplementationOnce(async () => 100)
         .mockImplementationOnce(async () => 0)
      jest.spyOn(fs, 'chmodSync').mockImplementation()
      jest.spyOn(core, 'exportVariable').mockImplementation()
      jest.spyOn(core, 'debug').mockImplementation()

      await expect(run()).resolves.not.toThrowError()
      expect(exec.exec).toBeCalledTimes(2)
   })
})
