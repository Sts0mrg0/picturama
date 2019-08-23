import { ipcRenderer } from 'electron'

import { UiConfig, Settings } from 'common/CommonTypes'
import { PhotoId, Photo, PhotoDetail, PhotoWork, PhotoFilter, PhotoSection, PhotoSectionId, Tag } from 'common/CommonTypes'
import { assertRendererProcess } from 'common/util/ElectronUtil'


assertRendererProcess()


// We used to use electron.require for this, but it was too buggy.
// (I passed a value to an IPC stub and the other side got a value from a previous call)


interface CallInfo {
    resolve(result: any)
    reject(error: any)
}


let isInitialized = false
let nextCallId = 1
const pendingCalls: { [key:number]: CallInfo } = {}


export default {

    init() {
        if (isInitialized) {
            throw new Error('BackgroundClient is already initialized')
        }
        isInitialized = true
        ipcRenderer.on('onBackgroundActionDone', (event, callId, error, result) => {
            const callInfo = pendingCalls[callId]
            delete pendingCalls[callId]
            if (callInfo) {
                if (error) {
                    callInfo.reject(error)
                } else {
                    callInfo.resolve(result)
                }
            }
        })
    },

    waitForBackgroundReady(): Promise<void> {
        return callOnBackground('waitForBackgroundReady')
    },

    toggleFullScreen(): Promise<void> {
        return callOnBackground('toggleFullScreen')
    },

    fetchUiConfig(): Promise<UiConfig> {
        return callOnBackground('fetchUiConfig')
    },

    fetchSettings(): Promise<Settings> {
        return callOnBackground('fetchSettings')
    },

    storeSettings(settings: Settings) {
        return callOnBackground('storeSettings', { settings })
    },

    getFileSize(path: string): Promise<number> {
        return callOnBackground('getFileSize', { path })
    },

    selectDirectories(): Promise<string[] | undefined> {
        return callOnBackground('selectDirectories')
    },

    startImport(): Promise<void> {
        return callOnBackground('startImport')
    },

    fetchTotalPhotoCount(): Promise<number> {
        return callOnBackground('fetchTotalPhotoCount')
    },

    fetchSections(filter: PhotoFilter): Promise<PhotoSection[]> {
        return callOnBackground('fetchSections', { filter })
    },

    fetchSectionPhotos(sectionId: PhotoSectionId, filter: PhotoFilter): Promise<Photo[]> {
        return callOnBackground('fetchSectionPhotos', { sectionId, filter })
    },

    updatePhotos(photoIds: PhotoId[], update: Partial<Photo>): Promise<void> {
        return callOnBackground('updatePhotos', { photoIds, update })
    },

    fetchPhotoDetail(photoId: PhotoId): Promise<PhotoDetail> {
        return callOnBackground('fetchPhotoDetail', { photoId })
    },

    fetchPhotoWork(photoDir: string, photoFileName: string): Promise<PhotoWork> {
        return callOnBackground('fetchPhotoWork', { photoDir, photoFileName })
    },

    storePhotoWork(photoDir: string, photoFileName: string, photoWork: PhotoWork): Promise<void> {
        return callOnBackground('storePhotoWork', { photoDir, photoFileName, photoWork })
    },

    storeThumbnail(thumbnailPath: string, thumbnailData: string): Promise<void> {
        return callOnBackground('storeThumbnail', { thumbnailPath, thumbnailData })
    },

    fetchTags(): Promise<Tag[]> {
        return callOnBackground('fetchTags')
    },

    storePhotoTags(photoId: PhotoId, photoTags: string[]): Promise<Tag[] | null> {
        return callOnBackground('storePhotoTags', { photoId, photoTags })
    },

}

async function callOnBackground(action: string, params: any = null): Promise<any> {
    if (!isInitialized) {
        throw new Error('BackgroundClient is not yet initialized')
    }

    const callId = nextCallId++

    return new Promise<any>((resolve, reject) => {
        pendingCalls[callId] = { resolve, reject }
        ipcRenderer.send('executeBackgroundAction', callId, action, params)
    })
}