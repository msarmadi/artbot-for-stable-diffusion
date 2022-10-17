/* eslint-disable @next/next/no-img-element */
import { useRouter } from 'next/router'

import { useStore } from 'statery'
import { appInfoStore } from '../store/appStore'
import { createImageJob } from '../utils/imageCache'
import { deleteCompletedImage } from '../utils/db'
import { savePrompt } from '../utils/promptUtils'
import ConfirmationModal from './ConfirmationModal'
import { useCallback, useState } from 'react'
import TrashIcon from './icons/TrashIcon'
import DownloadIcon from './icons/DownloadIcon'
import { Button } from './Button'
import { trackEvent } from '../api/telemetry'
import RefreshIcon from './icons/RefreshIcon'
import UploadIcon from './icons/UploadIcon'

interface ImageDetails {
  jobId: string
  timestamp: number
  prompt: string
  height?: number
  width?: number
  cfg_scale?: string
  steps?: number
  sampler?: string
  seed: number
  negative?: string
  base64String: string
}

interface ImageDetailsProps {
  imageDetails: ImageDetails
  onDelete: () => void
}

const ImageDetails = ({
  imageDetails,
  onDelete = () => {}
}: ImageDetailsProps) => {
  const router = useRouter()

  const appState = useStore(appInfoStore)
  const { img2imgFeature } = appState

  const [pending, setPending] = useState(false)
  const [pendingDownload, setPendingDownload] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const handleDeleteImageClick = async (jobId: string) => {
    await deleteCompletedImage(jobId)
    onDelete()
    trackEvent({
      event: 'DELETE_IMAGE',
      context: 'ImagePage'
    })
    setShowDeleteModal(false)
  }

  const handleCopyPromptClick = (imageDetails: {
    prompt?: string
    parentJobId?: string
    negative?: string
  }) => {
    savePrompt({
      prompt: imageDetails.prompt,
      parentJobId: imageDetails.parentJobId,
      negative: imageDetails.negative
    })

    trackEvent({
      event: 'COPY_PROMPT',
      context: 'ImagePage'
    })

    router.push(`/?edit=true`)
  }

  const handleUploadClick = (imageDetails: {
    prompt?: string
    parentJobId?: string
    negative?: string
    base64String: string
  }) => {
    savePrompt({
      img2img: true,
      prompt: imageDetails.prompt,
      parentJobId: imageDetails.parentJobId,
      negative: imageDetails.negative,
      source_image: imageDetails.base64String
    })

    trackEvent({
      event: 'IMG2IMG_CLICK',
      context: 'ImagePage'
    })

    router.push(`/?edit=true`)
  }

  const handleDownloadClick = async (imageDetails: any) => {
    if (pendingDownload) {
      return
    }

    setPendingDownload(true)
    const res = await fetch(`/artbot/api/get-png`, {
      method: 'POST',
      body: JSON.stringify({
        imgString: imageDetails.base64String
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    const data = await res.json()
    const { success } = data

    if (success) {
      trackEvent({
        event: 'DOWNLOAD_PNG',
        context: 'ImagePage'
      })

      const filename = imageDetails.prompt
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase()
        .slice(0, 254)
      var a = document.createElement('a')
      a.href = 'data:image/png;base64,' + data.base64String
      a.download = filename + '.png'
      a.click()
    }
    setPendingDownload(false)
  }

  const handleRerollClick = useCallback(
    async (imageDetails: any) => {
      if (pending) {
        return
      }

      setPending(true)
      const cleanParams = Object.assign({}, imageDetails)

      delete cleanParams.base64String
      delete cleanParams.id
      delete cleanParams.jobId
      delete cleanParams.queue_position
      delete cleanParams.seed
      delete cleanParams.success
      delete cleanParams.timestamp
      delete cleanParams.wait_time

      const res = await createImageJob({
        ...cleanParams
      })

      if (res.success) {
        trackEvent({
          event: 'REROLL_IMAGE',
          context: 'ImagePage'
        })
        router.push('/pending')
      }
    },
    [pending, router]
  )

  return (
    <div className="mt-2 text-left">
      {showDeleteModal && (
        <ConfirmationModal
          onConfirmClick={() => handleDeleteImageClick(imageDetails.jobId)}
          closeModal={() => setShowDeleteModal(false)}
        />
      )}
      <div className="pt-2 font-mono">{imageDetails.prompt}</div>
      <div className="font-mono text-xs mt-2">
        -- Settings --
        <ul>
          {imageDetails.negative && (
            <li>Negative prompt: {imageDetails.negative}</li>
          )}
          <li>Sampler: {imageDetails.sampler}</li>
          <li>Seed: {imageDetails.seed}</li>
          <li>Steps: {imageDetails.steps}</li>
          <li>cfg scale: {imageDetails.cfg_scale}</li>
        </ul>
      </div>
      <div className="font-mono text-xs mt-2">
        Created: {new Date(imageDetails.timestamp).toLocaleString()}
      </div>
      <div className="mt-2 w-full flex flex-row">
        <div className="inline-block w-3/4 flex flex-row gap-2">
          <Button
            title="Copy and re-edit prompt"
            onClick={() => handleCopyPromptClick(imageDetails)}
          >
            Copy prompt
          </Button>
          <Button
            title="Request new image with same settings"
            onClick={() => handleRerollClick(imageDetails)}
            disabled={pending}
          >
            <RefreshIcon className="mx-auto" />
          </Button>
          {img2imgFeature && (
            <Button
              title="Use for img2img"
              onClick={() => handleUploadClick(imageDetails)}
            >
              <UploadIcon className="mx-auto" />
            </Button>
          )}
          <Button
            title="Download PNG"
            onClick={() => handleDownloadClick(imageDetails)}
            disabled={pendingDownload}
          >
            <DownloadIcon className="mx-auto" />
          </Button>
        </div>
        <div className="inline-block w-1/4 flex flex-row justify-end">
          <Button
            title="Delete image"
            btnType="secondary"
            onClick={() => setShowDeleteModal(true)}
          >
            <TrashIcon className="mx-auto" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ImageDetails
