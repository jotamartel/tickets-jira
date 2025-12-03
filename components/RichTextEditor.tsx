'use client'

import { useMemo, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import 'react-quill/dist/quill.snow.css'

// Importar Quill dinámicamente para evitar problemas de SSR
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  onImageUpload?: (file: File) => Promise<string> // Retorna la URL de la imagen
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Describe en detalle tu solicitud o problema...',
  error,
  onImageUpload
}: RichTextEditorProps) {
  const onChangeRef = useRef(onChange)
  const valueRef = useRef(value)
  const onImageUploadRef = useRef(onImageUpload)
  
  // Mantener refs actualizados
  onChangeRef.current = onChange
  valueRef.current = value
  onImageUploadRef.current = onImageUpload

  // Handler estable para subir imágenes
  const handleImageUpload = useCallback(function(this: any) {
    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (file && onImageUploadRef.current) {
        try {
          // Subir imagen y obtener URL
          const imageUrl = await onImageUploadRef.current(file)
          
          // Acceder al editor de Quill desde el contexto del handler
          const quill = this.quill
          if (quill) {
            const range = quill.getSelection(true)
            const index = range?.index || 0
            quill.insertEmbed(index, 'image', imageUrl, 'user')
          } else {
            // Fallback: insertar directamente en el HTML
            const imgTag = `<img src="${imageUrl}" alt="Imagen adjunta" />`
            onChangeRef.current(valueRef.current + imgTag)
          }
        } catch (error) {
          console.error('Error subiendo imagen:', error)
          alert('Error al subir la imagen. Intenta nuevamente.')
        }
      }
    }
    input.click()
  }, [])

  // Configurar módulos de Quill (solo se recrea si cambia onImageUpload)
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'color': [] }, { 'background': [] }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: handleImageUpload
      }
    },
    clipboard: {
      matchVisual: false
    }
  }), [handleImageUpload])

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'color', 'background',
    'link', 'image'
  ]

  // Handler estable para onChange que no causa re-renderizados
  const handleChange = useCallback((content: string) => {
    onChangeRef.current(content)
  }, [])

  return (
    <div className="rich-text-editor-wrapper">
      <div className={`border rounded-lg ${error ? 'border-red-500' : 'border-gray-300'} focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent bg-white`}>
        <ReactQuill
          theme="snow"
          value={value}
          onChange={handleChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          className="rich-text-editor"
          style={{ minHeight: '200px' }}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <style jsx global>{`
        .rich-text-editor-wrapper {
          width: 100%;
        }
        .rich-text-editor-wrapper .ql-container {
          min-height: 200px !important;
          font-size: 14px;
          height: auto !important;
        }
        .rich-text-editor-wrapper .ql-editor {
          min-height: 200px !important;
          height: auto !important;
          padding: 12px 15px !important;
          overflow-y: visible !important;
        }
        .rich-text-editor-wrapper .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
          left: 15px;
        }
        .rich-text-editor-wrapper .ql-editor img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 10px 0;
        }
        .rich-text-editor-wrapper .ql-toolbar {
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
          border-bottom: none;
          background-color: #f9fafb;
        }
        .rich-text-editor-wrapper .ql-container {
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
          font-family: inherit;
        }
        .rich-text-editor-wrapper .ql-editor p,
        .rich-text-editor-wrapper .ql-editor ol,
        .rich-text-editor-wrapper .ql-editor ul,
        .rich-text-editor-wrapper .ql-editor pre,
        .rich-text-editor-wrapper .ql-editor blockquote,
        .rich-text-editor-wrapper .ql-editor h1,
        .rich-text-editor-wrapper .ql-editor h2,
        .rich-text-editor-wrapper .ql-editor h3 {
          margin: 0;
          padding: 0;
        }
        .rich-text-editor-wrapper .ql-editor p {
          margin-bottom: 0.5em;
        }
        .rich-text-editor-wrapper .ql-editor p:last-child {
          margin-bottom: 0;
        }
        .rich-text-editor-wrapper .ql-editor strong {
          font-weight: 600;
        }
        .rich-text-editor-wrapper .ql-editor em {
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
