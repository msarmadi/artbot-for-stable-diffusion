import { setImg2ImgFeature } from '../store/appStore'
import { trackNewSession } from './analytics'

/**
 * Added "Allow NSFW Image" setting on 2022-10-11.
 * Will default to false for new users.
 * If already an existing user (purely going off whether
 * they've changed default image orientation -- this is not
 * 100% foolproof), leave true so behavior doesn't change for
 * existing users.
 */
export const checkNsfwSettings = () => {
  if (
    localStorage.getItem('orientation') &&
    !localStorage.getItem('allowNsfwImages')
  ) {
    localStorage.setItem('allowNsfwImages', 'true')
  } else if (!localStorage.getItem('allowNsfwImages')) {
    localStorage.setItem('allowNsfwImages', 'false')
  }
}

export const updateShowGrid = () => {
  if (localStorage.getItem('showGrid') === 'true') {
    localStorage.setItem('showLayout', 'grid')
  } else if (localStorage.getItem('showGrid') === 'false') {
    localStorage.setItem('showLayout', 'list')
  }

  localStorage.removeItem('showGrid')
}

export const initAppSettings = async () => {
  if (typeof window === 'undefined') {
    return
  }

  const urlParams = new URLSearchParams(window.location.search)
  const img2imgEnabled = urlParams.get('enableImg2Img')

  if (img2imgEnabled) {
    setImg2ImgFeature(true)
  }

  await trackNewSession()
  checkNsfwSettings()
  updateShowGrid()
}
