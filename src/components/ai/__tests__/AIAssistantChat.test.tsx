import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AIAssistantChat } from '../AIAssistantChat';
import { useAIAssistant } from '@/hooks/useAIAssistant';

// Mock the hook
jest.mock('@/hooks/useAIAssistant');

const mockUseAIAssistant = useAIAssistant as jest.MockedFunction<typeof useAIAssistant>;

describe('AIAssistantChat', () => {
  const mockSendMessage = jest.fn();
  const mockStartListening = jest.fn();
  const mockStopListening = jest.fn();
  const mockClearMessages = jest.fn();
  const mockSetInputMode = jest.fn();

  beforeEach(() => {
    mockUseAIAssistant.mockReturnValue({
      messages: [],
      isLoading: false,
      isListening: false,
      isStreaming: false,
      error: null,
      inputMode: 'text',
      sendMessage: mockSendMessage,
      startListening: mockStartListening,
      stopListening: mockStopListening,
      cancelStreaming: jest.fn(),
      clearMessages: mockClearMessages,
      setInputMode: mockSetInputMode,
      hasVoiceSupport: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly in expanded mode', () => {
    render(<AIAssistantChat defaultMode="expanded" />);
    
    expect(screen.getByText('Assistant Culinaire')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Posez votre question/)).toBeInTheDocument();
  });

  it('renders correctly in minimized mode', () => {
    const onClose = jest.fn();
    render(<AIAssistantChat defaultMode="minimized" onClose={onClose} />);
    
    expect(screen.getByRole('button', { name: /fermer/i })).toBeInTheDocument();
  });

  it('sends a text message when form is submitted', async () => {
    render(<AIAssistantChat />);
    
    const input = screen.getByPlaceholderText(/Posez votre question/);
    const sendButton = screen.getByRole('button', { name: /envoyer/i });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Test message', 'text');
    });
  });

  it('toggles voice input when microphone button is clicked', () => {
    render(<AIAssistantChat />);
    
    const micButton = screen.getByRole('button', { name: /microphone/i });
    fireEvent.click(micButton);

    expect(mockSetInputMode).toHaveBeenCalledWith('voice');
  });

  it('displays messages correctly', () => {
    mockUseAIAssistant.mockReturnValue({
      ...mockUseAIAssistant(),
      messages: [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
          mode: 'text'
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Bonjour! Comment puis-je vous aider?',
          timestamp: new Date()
        }
      ]
    });

    render(<AIAssistantChat />);
    
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Bonjour! Comment puis-je vous aider?')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseAIAssistant.mockReturnValue({
      ...mockUseAIAssistant(),
      isLoading: true
    });

    render(<AIAssistantChat />);
    
    expect(screen.getByText(/Chargement/)).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockUseAIAssistant.mockReturnValue({
      ...mockUseAIAssistant(),
      error: 'Test error message'
    });

    render(<AIAssistantChat />);
    
    expect(screen.getByText(/Test error message/)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<AIAssistantChat onClose={onClose} />);
    
    const closeButton = screen.getByRole('button', { name: /fermer/i });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('displays suggested actions when provided', () => {
    mockUseAIAssistant.mockReturnValue({
      ...mockUseAIAssistant(),
      messages: [
        {
          id: '1',
          role: 'assistant',
          content: 'Je peux vous aider avec vos recettes!',
          timestamp: new Date(),
          metadata: {
            suggestedActions: [
              { label: 'Voir mes ingrédients', action: 'show_inventory' },
              { label: 'Recettes rapides', action: 'quick_recipes' }
            ]
          }
        }
      ]
    });

    render(<AIAssistantChat />);
    
    expect(screen.getByText('Voir mes ingrédients')).toBeInTheDocument();
    expect(screen.getByText('Recettes rapides')).toBeInTheDocument();
  });
});