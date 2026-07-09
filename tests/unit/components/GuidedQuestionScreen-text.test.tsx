import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GuidedQuestionScreen } from '../../../App/src/components/GuidedQuestionScreen';
import { BUILD_CATEGORIES } from '../../../App/src/data/buildCategories';

const category = BUILD_CATEGORIES.find((c) => c.id === 'video')!;

const textQuestion = {
  id: 'video-custom-format',
  prompt: 'Enter the ratio or size',
  input: 'text' as const,
  placeholder: 'e.g. 16:9 or 1920 × 1080',
  options: [],
};

describe('GuidedQuestionScreen text input', () => {
  it('renders an input with the placeholder and submits the typed value on Continue', async () => {
    const user = userEvent.setup();
    const onSelectOption = vi.fn();
    render(
      <GuidedQuestionScreen
        category={category}
        question={textQuestion}
        questionIndex={2}
        totalQuestions={3}
        selectedOptionId={undefined}
        onSelectOption={onSelectOption}
        onBack={() => {}}
        busyLabel={null}
      />,
    );

    await user.type(screen.getByPlaceholderText('e.g. 16:9 or 1920 × 1080'), '21:9');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onSelectOption).toHaveBeenCalledWith('21:9');
  });

  it('submits an empty string when nothing is typed (resolver falls back honestly)', async () => {
    const user = userEvent.setup();
    const onSelectOption = vi.fn();
    render(
      <GuidedQuestionScreen
        category={category}
        question={textQuestion}
        questionIndex={2}
        totalQuestions={3}
        selectedOptionId={undefined}
        onSelectOption={onSelectOption}
        onBack={() => {}}
        busyLabel={null}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onSelectOption).toHaveBeenCalledWith('');
  });

  it('still renders chips for option questions', () => {
    render(
      <GuidedQuestionScreen
        category={category}
        question={category.questions[0]}
        questionIndex={0}
        totalQuestions={2}
        selectedOptionId={undefined}
        onSelectOption={() => {}}
        onBack={() => {}}
        busyLabel={null}
      />,
    );

    expect(screen.getByText('Keynote / AGM screen')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
  });
});
