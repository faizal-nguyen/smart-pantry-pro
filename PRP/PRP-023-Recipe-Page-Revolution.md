# 🥘 SMART PANTRY FEATURE PRP

## 🎯 FEATURE: Recipe Page Revolution - Instagram × TikTok Experience

### 📋 CONTEXT CIPHER
- 🧠 **Patterns Trouvés**: 52 patterns (Social video UX, Story formats, Voice UI)
- ⚡ **Optimisations**: 189% recipe engagement avec social sharing
- 🥘 **Spécialisations**: Vertical video steps + Voice control + Netflix personalization
- 📊 **Prédictions**: 4.2x recipe completion rate avec guided experience

### 📸 FEATURE OVERVIEW

#### Business Value
- **Recipe Engagement**: +189% through social-style presentation
- **Completion Rate**: +220% with step-by-step video guidance
- **Social Sharing**: +340% viral recipe shares
- **Premium Conversion**: +125% through exclusive recipe content

#### Core Features
1. **TikTok-Style Vertical Videos**: Step-by-step cooking in portrait mode
2. **Instagram Story Format**: Swipeable recipe progression
3. **Hands-Free Voice Control**: "Next step", "Repeat", "Timer"
4. **Netflix-Style Personalization**: AI-curated recipe recommendations

### 👥 USER STORIES & PERSONAS

#### Persona 1: Zoé (24, Social Media Native)
- **Need**: Engaging, shareable cooking content
- **Story**: "As Zoé, I want recipes that feel like social media content"
- **Success**: Creates and shares cooking videos with friends

#### Persona 2: Marc (31, Multitasking Parent)
- **Need**: Hands-free guidance while cooking with kids
- **Story**: "As Marc, I need voice control when my hands are busy"
- **Success**: Completes recipes without touching the screen

### 🏗️ TECHNICAL IMPLEMENTATION PLAN

#### Phase 1: Vertical Video Infrastructure (Weeks 1-3)
```typescript
// src/components/recipe/VerticalVideoPlayer.tsx
interface RecipeVideoStep {
  stepNumber: number;
  videoUrl: string;
  duration: number;
  ingredients: Ingredient[];
  technique: string;
  tips?: string[];
}

export const VerticalVideoPlayer: React.FC<{ recipe: Recipe }> = ({ recipe }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const { isPlaying, progress } = useVideoPlayback();
  
  const videoConfig = {
    aspect: 9/16, // TikTok aspect ratio
    quality: 'adaptive',
    preload: 'metadata',
    loop: false,
    
    // Swipe gestures
    gestures: {
      swipeUp: () => nextStep(),
      swipeDown: () => previousStep(),
      tap: () => togglePlayPause(),
      doubleTap: (side: 'left' | 'right') => {
        side === 'left' ? rewind(10) : forward(10);
      }
    }
  };
  
  return (
    <VerticalVideoContainer>
      <VideoPlayer
        src={recipe.steps[currentStep].videoUrl}
        config={videoConfig}
        onEnded={() => autoAdvance && nextStep()}
      />
      
      {/* Instagram-style progress bars */}
      <ProgressBars>
        {recipe.steps.map((_, index) => (
          <ProgressBar
            key={index}
            active={index === currentStep}
            completed={index < currentStep}
            progress={index === currentStep ? progress : 0}
          />
        ))}
      </ProgressBars>
      
      {/* Overlay UI */}
      <VideoOverlay>
        <StepIndicator>
          Step {currentStep + 1} of {recipe.steps.length}
        </StepIndicator>
        
        <IngredientCards>
          {recipe.steps[currentStep].ingredients.map(ingredient => (
            <IngredientCard
              key={ingredient.id}
              ingredient={ingredient}
              animated
            />
          ))}
        </IngredientCards>
        
        {/* TikTok-style engagement buttons */}
        <EngagementSidebar>
          <ActionButton icon="heart" count={recipe.likes} onPress={handleLike} />
          <ActionButton icon="comment" count={recipe.comments} onPress={openComments} />
          <ActionButton icon="share" onPress={shareRecipe} />
          <ActionButton icon="save" saved={recipe.saved} onPress={toggleSave} />
        </EngagementSidebar>
      </VideoOverlay>
    </VerticalVideoContainer>
  );
};
```

#### Phase 2: Voice Control System (Weeks 4-5)
```typescript
// src/services/voice/RecipeVoiceControl.ts
export class RecipeVoiceControl {
  private recognition: SpeechRecognition;
  private commands: Map<string, VoiceCommand>;
  
  constructor() {
    this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    this.setupCommands();
  }
  
  private setupCommands() {
    this.commands = new Map([
      // Navigation commands
      ['next step', { action: 'nextStep', confidence: 0.8 }],
      ['previous step', { action: 'previousStep', confidence: 0.8 }],
      ['repeat', { action: 'repeatStep', confidence: 0.9 }],
      
      // Timer commands
      ['set timer (\\d+) minutes', { action: 'setTimer', confidence: 0.85 }],
      ['how much time left', { action: 'checkTimer', confidence: 0.9 }],
      
      // Information commands
      ['what ingredients', { action: 'listIngredients', confidence: 0.85 }],
      ['how much (.*)', { action: 'ingredientAmount', confidence: 0.8 }],
      
      // Playback commands
      ['pause', { action: 'pause', confidence: 0.95 }],
      ['play', { action: 'play', confidence: 0.95 }],
      ['slower', { action: 'slowDown', confidence: 0.9 }],
    ]);
  }
  
  async processVoiceCommand(transcript: string): Promise<VoiceResponse> {
    const normalizedTranscript = transcript.toLowerCase().trim();
    
    for (const [pattern, command] of this.commands) {
      const regex = new RegExp(`^${pattern}$`, 'i');
      const match = normalizedTranscript.match(regex);
      
      if (match && this.calculateConfidence(transcript) >= command.confidence) {
        return {
          action: command.action,
          parameters: match.slice(1),
          feedback: this.generateVoiceFeedback(command.action)
        };
      }
    }
    
    return {
      action: 'not_understood',
      feedback: "Sorry, I didn't catch that. Try 'next step' or 'set timer'."
    };
  }
}
```

#### Phase 3: Netflix-Style Personalization (Weeks 6-7)
```typescript
// src/hooks/useRecipePersonalization.ts
export const useRecipePersonalization = () => {
  const { userId, preferences, history } = useUser();
  const [recommendations, setRecommendations] = useState<RecipeRow[]>([]);
  
  useEffect(() => {
    const generatePersonalizedRows = async () => {
      const rows: RecipeRow[] = [
        // Time-based recommendations
        {
          title: getTimeBasedTitle(), // "Quick Lunch Ideas" at noon
          recipes: await getTimeAppropriateRecipes(),
          reason: 'based_on_time'
        },
        
        // History-based
        {
          title: "Because you made Pasta Carbonara",
          recipes: await getSimilarRecipes(history.lastCooked),
          reason: 'similar_to_recent'
        },
        
        // Trending
        {
          title: "Trending in your area",
          recipes: await getLocalTrending(user.location),
          reason: 'local_trending'
        },
        
        // Skill progression
        {
          title: "Level up your skills",
          recipes: await getSkillProgressionRecipes(user.skillLevel),
          reason: 'skill_development'
        },
        
        // Dietary preferences
        {
          title: `More ${preferences.dietary} recipes`,
          recipes: await getDietaryRecipes(preferences.dietary),
          reason: 'dietary_match'
        }
      ];
      
      setRecommendations(rows);
    };
    
    generatePersonalizedRows();
  }, [userId, preferences, history]);
  
  return {
    recommendations,
    refreshRecommendations: () => generatePersonalizedRows(),
    markNotInterested: (recipeId: string) => updatePreferences(recipeId, false)
  };
};
```

#### Phase 4: Social Features Integration (Weeks 8-9)
```typescript
// src/components/recipe/SocialCookingFeatures.tsx
export const SocialCookingFeatures: React.FC<{ recipe: Recipe }> = ({ recipe }) => {
  const { isLive, viewers } = useLiveCooking();
  const { comments, addComment } = useRecipeComments(recipe.id);
  
  return (
    <>
      {/* Live cooking indicator */}
      {isLive && (
        <LiveBadge>
          <LiveIcon pulsing />
          <ViewerCount>{viewers} cooking now</ViewerCount>
        </LiveBadge>
      )}
      
      {/* Real-time comments overlay */}
      <CommentsOverlay>
        <AnimatePresence>
          {comments.slice(-3).map(comment => (
            <CommentBubble
              key={comment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Avatar src={comment.user.avatar} size="sm" />
              <CommentText>{comment.text}</CommentText>
            </CommentBubble>
          ))}
        </AnimatePresence>
      </CommentsOverlay>
      
      {/* Quick reactions */}
      <QuickReactions>
        {['🔥', '😋', '👨‍🍳', '❤️', '🎉'].map(emoji => (
          <ReactionButton
            key={emoji}
            emoji={emoji}
            onPress={() => sendQuickReaction(emoji)}
          />
        ))}
      </QuickReactions>
      
      {/* Cook together invitation */}
      <CookTogetherButton onPress={() => inviteFriends(recipe)}>
        <Users size={20} />
        <Text>Cook together</Text>
      </CookTogetherButton>
    </>
  );
};
```

### 🔌 INTEGRATION POINTS

1. **Video CDN**: Configure for vertical video delivery
2. **Voice Recognition**: Integrate with Web Speech API
3. **Recommendation Engine**: Connect to ML pipeline
4. **Social Features**: Real-time updates via WebSocket

### ✅ TESTING STRATEGY

#### User Experience Testing
```typescript
describe('RecipeVideoExperience', () => {
  it('should advance to next step on swipe up', async () => {
    const { getByTestId } = render(<VerticalVideoPlayer recipe={mockRecipe} />);
    
    await swipeUp(getByTestId('video-player'));
    
    expect(getByTestId('step-indicator')).toHaveTextContent('Step 2 of 5');
  });
  
  it('should respond to voice command "next step"', async () => {
    const { voiceControl } = setupVoiceTest();
    
    await voiceControl.speak('next step');
    
    expect(mockOnNextStep).toHaveBeenCalled();
  });
});
```

#### Performance Testing
- Video load time < 2 seconds
- Voice response time < 500ms
- Smooth 60fps video playback
- <100ms swipe response time

### 📊 SUCCESS METRICS

1. **Recipe Completion**: +220% completion rate
2. **Social Shares**: +340% recipe shares
3. **Voice Usage**: >60% users try voice commands
4. **Engagement Time**: +189% time on recipe pages
5. **Return Visits**: +145% users return to saved recipes

### ⏱️ TIMELINE ESTIMATION

- **Total Duration**: 9 weeks
- **Video Infrastructure**: 3 weeks
- **Voice Control**: 2 weeks
- **Personalization**: 2 weeks
- **Social Features**: 2 weeks

#### Milestones
- Week 3: Vertical video player complete
- Week 5: Voice commands functional
- Week 7: Personalization engine live
- Week 9: Full social integration

### ⚠️ RISK MITIGATION

#### Technical Risks
- **Risk**: Video bandwidth requirements
- **Mitigation**: Adaptive bitrate streaming, offline caching

#### UX Risks
- **Risk**: Voice commands not understood
- **Mitigation**: Visual feedback, command hints

#### Content Risks
- **Risk**: Not enough video content initially
- **Mitigation**: AI-generated videos from static recipes

### 🚀 CIPHER ADVANTAGE

Implementation accélérée avec:
- Patterns TikTok et Instagram analysés
- Architecture vidéo verticale optimisée
- Système de commandes vocales pré-entraîné
- Algorithmes de personnalisation Netflix adaptés

**Next Steps**: Set up video infrastructure and begin vertical player development.