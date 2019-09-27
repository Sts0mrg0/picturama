import React from 'react'
import { findDOMNode } from 'react-dom'
import classnames from 'classnames'

import { bindMany } from 'common/util/LangUtil'

import { Rect, Point } from 'app/UITypes'
import DragDropController from 'app/util/DragDropController'

import './CropOverlay.less'


const borderWidth = 1
const hintStrokeWidth = 1
const edgeWidth = 3
const edgeSize = 20

export type Edge = 'nw' | 'ne' | 'sw' | 'se'
const edges: Edge[] = [ 'nw', 'ne', 'sw', 'se' ]

const edgePaths: { [K in Edge]: string } = {
    nw: `m${-edgeWidth/2},${edgeSize - edgeWidth/2} l0,${-edgeSize} l${edgeSize},0`,
    ne: `m${-edgeSize + edgeWidth/2},${-edgeWidth/2} l${edgeSize},0 l0,${edgeSize}`,
    sw: `m${-edgeWidth/2},${-edgeSize + edgeWidth/2} l0,${edgeSize} l${edgeSize},0`,
    se: `m${-edgeSize + edgeWidth/2},${edgeWidth/2} l${edgeSize},0 l0,${-edgeSize}`,
}

export interface Props {
    className?: any
    width: number
    height: number
    rect: Rect
    onEdgeDrag(edge: Edge, point: Point, isFinished: boolean): void
}

interface State {
    edgeDragInfo: { edge: Edge, anchor: Point } | null
}

export default class CropOverlay extends React.Component<Props, State> {

    private edgeDragDropController: DragDropController

    constructor(props: Props) {
        super(props)
        bindMany(this, 'renderEdge')
        this.state = { edgeDragInfo: null }

        this.edgeDragDropController = new DragDropController({
            onDragStart: (point: Point, event: React.MouseEvent) => {
                const targetElem = event.target as SVGElement
                const targetRect = targetElem.getBoundingClientRect()
                const edge = targetElem.dataset.edge as Edge
                const anchor: Point = {
                    x: event.clientX - targetRect.left - edgeSize,
                    y: event.clientY - targetRect.top - edgeSize,
                }
                this.setState({ edgeDragInfo: { edge, anchor } })
            },
            onDrag: (point: Point, isFinished: boolean, event: MouseEvent) => {
                const { edgeDragInfo } = this.state
                if (edgeDragInfo) {
                    const edgePoint = {
                        x: point.x - edgeDragInfo.anchor.x,
                        y: point.y - edgeDragInfo.anchor.y,
                    }
                    this.props.onEdgeDrag(edgeDragInfo.edge, edgePoint, isFinished)
                }
                if (isFinished) {
                    this.setState({ edgeDragInfo: null })
                }
            }
        })
    }

    componentDidMount() {
        const mainElem = findDOMNode(this.refs.main) as SVGElement
        this.edgeDragDropController.setContainerElem(mainElem)
    }

    private renderHintLines(xPartCount: number, yPartCount: number) {
        const { rect } = this.props

        let pathParts: string[] = []
        for (let xPart = 1; xPart < xPartCount; xPart++) {
            const x = Math.round(rect.x + rect.width * xPart / xPartCount)
            pathParts.push(`M${x - hintStrokeWidth / 2},${rect.y} l0,${rect.height}`)
        }
        for (let yPart = 1; yPart < yPartCount; yPart++) {
            const y = Math.round(rect.y + rect.height * yPart / yPartCount)
            pathParts.push(`M${rect.x},${y - hintStrokeWidth / 2} l${rect.width},0`)
        }

        return (
            <path
                className='CropOverlay-hint'
                d={pathParts.join(' ')}
                strokeWidth={hintStrokeWidth}
            />
        )
    }

    private renderEdge(edge: Edge) {
        const { rect } = this.props

        let cursor: string
        let transform: string
        switch (edge) {
            case 'nw': cursor = 'nwse-resize'; transform = `translate(${rect.x},${rect.y})`; break
            case 'ne': cursor = 'nesw-resize'; transform = `translate(${rect.x + rect.width},${rect.y})`; break
            case 'sw': cursor = 'nesw-resize'; transform = `translate(${rect.x},${rect.y + rect.height})`; break
            case 'se': cursor = 'nwse-resize'; transform = `translate(${rect.x + rect.width},${rect.y + rect.height})`; break
            default: throw new Error('Unepected edge: ' + edge)
        }

        return (
            <g key={edge} transform={transform}>
                <path className='CropOverlay-edge' strokeWidth={edgeWidth} d={edgePaths[edge]} />
                <rect
                    data-edge={edge}
                    className='CropOverlay-edgeHandle'
                    style={{ cursor }}
                    x={-edgeSize}
                    y={-edgeSize}
                    width={2 * edgeSize}
                    height={2 * edgeSize}
                    onMouseDown={this.edgeDragDropController.onMouseDown}
                />
            </g>
        )
    }

    render() {
        const { props, state } = this
        const { rect } = props

        let width = Math.max(0, props.width)
        let height = Math.max(0, props.height)

        return (
            <svg
                ref='main'
                className={classnames(props.className, 'CropOverlay')}
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
            >
                <path
                    className='CropOverlay-dim'
                    fillRule='evenodd'
                    d={`M0,0 l${width},0 l0,${height} l${-width},0 z M${rect.x},${rect.y} l0,${rect.height} l${rect.width},0 l0,${-rect.height} z`}
                />
                {state.edgeDragInfo &&
                    this.renderHintLines(3, 3)
                }
                <rect
                    className='CropOverlay-border'
                    x={rect.x - borderWidth / 2}
                    y={rect.y - borderWidth / 2}
                    width={rect.width + borderWidth}
                    height={rect.height + borderWidth}
                    strokeWidth={borderWidth}
                />
                {edges.map(this.renderEdge)}
            </svg>
        )
    }

}