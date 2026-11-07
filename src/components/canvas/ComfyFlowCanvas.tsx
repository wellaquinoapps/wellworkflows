import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ImageInputNode } from './nodes/ImageInputNode';
import { PromptNode } from './nodes/PromptNode';
import { NanoBananaModelNode } from './nodes/NanoBananaModelNode';
import { OutputPreviewNode } from './nodes/OutputPreviewNode';
import { AspectRatio, LocalReferenceImage, WorkflowImage } from '@/types';
import { Plus, Play, Sparkles, RefreshCw } from 'lucide-react';

interface ComfyFlowCanvasProps {
  referenceImages: LocalReferenceImage[];
  prompt: string;
  aspectRatio: AspectRatio;
  outputCount: number;
  results: WorkflowImage[];
  isGenerating: boolean;
  onAddImage: (file: File, roleType: any) => void;
  onRemoveImage: (id: string) => void;
  onUpdateRole: (id: string, roleType: any) => void;
  onPromptChange: (prompt: string) => void;
  onRatioChange: (ratio: AspectRatio) => void;
  onCountChange: (count: number) => void;
  onExecute: () => void;
  onPreviewImage: (url: string) => void;
}

export const ComfyFlowCanvas: React.FC<ComfyFlowCanvasProps> = ({
  referenceImages,
  prompt,
  aspectRatio,
  outputCount,
  results,
  isGenerating,
  onAddImage,
  onRemoveImage,
  onUpdateRole,
  onPromptChange,
  onRatioChange,
  onCountChange,
  onExecute,
  onPreviewImage,
}) => {
  const nodeTypes = useMemo(
    () => ({
      imageInput: ImageInputNode,
      promptNode: PromptNode,
      nanoBananaModel: NanoBananaModelNode,
      outputPreview: OutputPreviewNode,
    }),
    []
  );

  // Initial nodes positioning
  const initialNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];

    // Image Nodes on the Left (x: 50)
    if (referenceImages.length === 0) {
      nodes.push({
        id: 'img-node-default-1',
        type: 'imageInput',
        position: { x: 50, y: 50 },
        data: {
          label: 'Cenário (Fundo)',
          roleType: 'Cenário',
          onImageChange: (_id: string, file: File, role: any) => onAddImage(file, role),
        },
      });
      nodes.push({
        id: 'img-node-default-2',
        type: 'imageInput',
        position: { x: 50, y: 320 },
        data: {
          label: 'Produto #1 (Inserção)',
          roleType: 'Produto',
          onImageChange: (_id: string, file: File, role: any) => onAddImage(file, role),
        },
      });
    } else {
      referenceImages.forEach((img, idx) => {
        nodes.push({
          id: `img-node-${img.id}`,
          type: 'imageInput',
          position: { x: 50, y: 50 + idx * 260 },
          data: {
            label: `${img.roleType} (#${idx + 1})`,
            roleType: img.roleType,
            previewUrl: img.previewUrl,
            imageFile: img.file,
            onImageChange: (_id: string, file: File, role: any) => onAddImage(file, role),
            onRemove: (id: string) => onRemoveImage(id.replace('img-node-', '')),
            onRoleChange: (id: string, role: any) => onUpdateRole(id.replace('img-node-', ''), role),
          },
        });
      });
    }

    // Prompt Node (x: 400, y: 50)
    nodes.push({
      id: 'node-prompt',
      type: 'promptNode',
      position: { x: 400, y: 50 },
      data: {
        prompt,
        onPromptChange,
      },
    });

    // Nano Banana Engine Node (x: 400, y: 300)
    nodes.push({
      id: 'node-model',
      type: 'nanoBananaModel',
      position: { x: 400, y: 300 },
      data: {
        aspectRatio,
        outputCount,
        onRatioChange,
        onCountChange,
      },
    });

    // Output Node (x: 780, y: 150)
    nodes.push({
      id: 'node-output',
      type: 'outputPreview',
      position: { x: 780, y: 150 },
      data: {
        results,
        isGenerating,
        onPreviewImage,
      },
    });

    return nodes;
  }, [
    referenceImages,
    prompt,
    aspectRatio,
    outputCount,
    results,
    isGenerating,
    onAddImage,
    onRemoveImage,
    onUpdateRole,
    onPromptChange,
    onRatioChange,
    onCountChange,
    onPreviewImage,
  ]);

  // Initial Edges (Wires between nodes)
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [
      {
        id: 'e-prompt-model',
        source: 'node-prompt',
        sourceHandle: 'prompt-out',
        target: 'node-model',
        targetHandle: 'prompt-in',
        animated: true,
        style: { stroke: '#818cf8', strokeWidth: 2 },
      },
      {
        id: 'e-model-output',
        source: 'node-model',
        sourceHandle: 'image-render-out',
        target: 'node-output',
        targetHandle: 'render-in',
        animated: isGenerating,
        style: { stroke: '#10b981', strokeWidth: 2 },
      },
    ];

    if (referenceImages.length === 0) {
      edges.push({
        id: 'e-img1-model',
        source: 'img-node-default-1',
        sourceHandle: 'image-out',
        target: 'node-model',
        targetHandle: 'scenario-in',
        animated: true,
        style: { stroke: '#34d399', strokeWidth: 2 },
      });
      edges.push({
        id: 'e-img2-model',
        source: 'img-node-default-2',
        sourceHandle: 'image-out',
        target: 'node-model',
        targetHandle: 'product-in',
        animated: true,
        style: { stroke: '#22d3ee', strokeWidth: 2 },
      });
    } else {
      referenceImages.forEach((img, idx) => {
        edges.push({
          id: `e-img-${img.id}-model`,
          source: `img-node-${img.id}`,
          sourceHandle: 'image-out',
          target: 'node-model',
          targetHandle: idx === 0 ? 'scenario-in' : 'product-in',
          animated: true,
          style: { stroke: idx === 0 ? '#34d399' : '#22d3ee', strokeWidth: 2 },
        });
      });
    }

    return edges;
  }, [referenceImages, isGenerating]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync internal nodes state with external props changes
  React.useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  React.useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#6366f1', strokeWidth: 2 },
          },
          eds
        )
      ),
    [setEdges]
  );

  return (
    <div className="w-full h-[750px] bg-[#0b0c10] border border-surface-border rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
        <div className="px-4 py-2 rounded-xl bg-surface/90 border border-surface-border backdrop-blur-md shadow-lg flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-white tracking-wide">
            Canvas Interativo de Nós (ComfyUI / Flow)
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {referenceImages.length} Nós de Imagem
          </span>
        </div>

        <button
          type="button"
          onClick={onExecute}
          disabled={isGenerating}
          className="px-5 py-2.5 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-hover hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-xl shadow-primary/25 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Sintetizando...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              Executar Workflow Completo
            </>
          )}
        </button>
      </div>

      {/* Interactive Node Graph */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-[#0b0c10]"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#232738" />
        <Controls className="!bg-surface !border !border-surface-border !rounded-xl !overflow-hidden fill-white" />
        <MiniMap
          nodeColor="#1e2233"
          maskColor="rgba(11, 12, 16, 0.7)"
          className="!bg-surface !border !border-surface-border !rounded-xl"
        />
      </ReactFlow>
    </div>
  );
};

