import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Logo from '../../../components/atoms/Logo';

describe('Logo Component', () => {
  it('renders correctly', () => {
    render(
      <BrowserRouter>
        <Logo />
      </BrowserRouter>
    );
    
    // Check if the logo text is rendered
    expect(screen.getByText('EvalPortal')).toBeInTheDocument();
    
    // Check if the link points to the home page
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/');
  });

  it('applies custom className', () => {
    render(
      <BrowserRouter>
        <Logo className="custom-class" />
      </BrowserRouter>
    );
    
    const link = screen.getByRole('link');
    expect(link).toHaveClass('custom-class');
  });
});