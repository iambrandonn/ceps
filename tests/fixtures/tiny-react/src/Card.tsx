import React, { Component } from 'react';

export interface CardProps {
  title: string;
  children: React.ReactNode;
}

export class Card extends Component<CardProps> {
  render() {
    return (
      <div className="card">
        <h2>{this.props.title}</h2>
        <div className="card-content">
          {this.props.children}
        </div>
      </div>
    );
  }
}
