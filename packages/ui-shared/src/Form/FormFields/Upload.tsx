import { FileInput, Icon, ProgressBar } from '@blueprintjs/core'
import React, { FC, Fragment, useReducer } from 'react'
import FileDisplay from '~/FileDisplay'

import sharedStyle from '../../../../ui-shared-lite/style.scss'
import { UploadFieldProps } from './typings'

const Upload: FC<UploadFieldProps> = (props) => {
  const uploadReducer = (state, action) => {
    if (action.type === 'uploadStart') {
      return {
        ...state,
        error: null,
        isUploading: true,
        uploadProgress: 0
      }
    } else if (action.type === 'uploadProgress') {
      return {
        ...state,
        uploadProgress: action.data.progress
      }
    } else if (action.type === 'deleteFile') {
      props.onChange?.(undefined)
      return {
        ...state,
        error: null,
        isUploading: false,
        uploadProgress: 0
      }
    } else if (action.type === 'uploadError') {
      const { error } = action.data

      return {
        ...state,
        error,
        isUploading: false,
        uploadProgress: 0
      }
    } else if (action.type === 'uploadSuccess') {
      const { url } = action.data

      props.onChange?.(url)
      return {
        ...state,
        error: null,
        isUploading: false,
        uploadProgress: 100
      }
    } else {
      throw new Error("That action type isn't supported.")
    }
  }

  const [state, dispatch] = useReducer(uploadReducer, {
    error: null,
    isUploading: false,
    uploadProgress: 0
  })

  const { error, isUploading, uploadProgress } = state

  const deleteFile = () => {
    dispatch({ type: 'deleteFile' })
  }

  const startUpload = async (event) => {
    const data = new FormData()
    data.append('file', event.target.files[0])

    dispatch({ type: 'uploadStart' })

    // Simulate progress for better UX (can be replaced with actual progress tracking if backend supports it)
    const progressInterval = setInterval(() => {
      dispatch({ type: 'uploadProgress', data: { progress: Math.min(uploadProgress + 10, 90) } })
    }, 200)

    await props.axios
      .post(props.customPath ? props.customPath : 'media', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          dispatch({ type: 'uploadProgress', data: { progress: percentCompleted } })
        }
      })
      .then((response) => {
        clearInterval(progressInterval)
        const url: string = response.data.url

        dispatch({ type: 'uploadSuccess', data: { url } })
      })
      .catch((e) => {
        clearInterval(progressInterval)
        dispatch({ type: 'uploadError', data: { error: e.message } })
      })
  }

  const { value, type, filter } = props

  const allowedMimeTypes = () => {
    if (filter) {
      return filter
    } else if (type) {
      // e.g. video/*, audio/*, ...
      return `${type}/*`
    } else {
      ; ('*')
    }
  }

  return (
    <div className={sharedStyle.fieldWrapper}>
      {value && <FileDisplay url={value} type={type} onDelete={deleteFile} deletable />}
      {!value && (
        <Fragment>
          <FileInput
            text={<Icon icon="upload" />}
            large
            disabled={isUploading}
            inputProps={{
              accept: allowedMimeTypes(),
              onChange: startUpload
            }}
          />
          {isUploading && (
            <div style={{ marginTop: '10px' }}>
              <ProgressBar
                value={uploadProgress / 100}
                intent="primary"
                stripes={uploadProgress < 100}
                animate={uploadProgress < 100}
              />
              <p style={{ fontSize: '12px', marginTop: '5px', color: '#5c7080' }}>
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}
          {error && <p className={sharedStyle.fieldError}>{error}</p>}
        </Fragment>
      )}
    </div>
  )
}

export default Upload
