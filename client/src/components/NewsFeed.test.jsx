import { render, screen, fireEvent } from '@testing-library/react';
import NewsFeed from './NewsFeed';

const mockNews = [
  { title: 'Markets rise on strong data', link: 'https://example.com/1', publisher: 'Reuters', thumbnail: 'https://img.example.com/1.jpg' },
  { title: 'Fed holds rates steady',      link: 'https://example.com/2', publisher: 'Bloomberg', thumbnail: null },
  { title: 'Tech stocks lead gains',      link: 'https://example.com/3', publisher: 'CNBC', thumbnail: null },
];

describe('NewsFeed', () => {
  it('shows loading message when news is empty', () => {
    render(<NewsFeed news={[]} activeIndex={-1} onSelect={() => {}} />);
    expect(screen.getByText('Loading news…')).toBeInTheDocument();
  });

  it('shows loading message when news is null', () => {
    render(<NewsFeed news={null} activeIndex={-1} onSelect={() => {}} />);
    expect(screen.getByText('Loading news…')).toBeInTheDocument();
  });

  it('renders all news items', () => {
    render(<NewsFeed news={mockNews} activeIndex={-1} onSelect={() => {}} />);
    expect(screen.getByText('Markets rise on strong data')).toBeInTheDocument();
    expect(screen.getByText('Fed holds rates steady')).toBeInTheDocument();
    expect(screen.getByText('Tech stocks lead gains')).toBeInTheDocument();
  });

  it('renders publisher names', () => {
    render(<NewsFeed news={mockNews} activeIndex={-1} onSelect={() => {}} />);
    expect(screen.getByText('Reuters')).toBeInTheDocument();
    expect(screen.getByText('Bloomberg')).toBeInTheDocument();
  });

  it('renders thumbnail image when provided', () => {
    const { container } = render(<NewsFeed news={mockNews} activeIndex={-1} onSelect={() => {}} />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://img.example.com/1.jpg');
  });

  it('calls onSelect with the correct index when an item is clicked', () => {
    const onSelect = vi.fn();
    render(<NewsFeed news={mockNews} activeIndex={-1} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Fed holds rates steady'));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('highlights the active item with blue publisher text', () => {
    render(<NewsFeed news={mockNews} activeIndex={0} onSelect={() => {}} />);
    const publisher = screen.getByText('Reuters');
    expect(publisher).toHaveStyle({ color: '#3b82f6' });
  });

  it('applies hover background on mouse enter when item is not active', () => {
    const { container } = render(<NewsFeed news={mockNews} activeIndex={-1} onSelect={() => {}} />);
    const firstItem = container.querySelector('[style*="cursor: pointer"]');
    fireEvent.mouseEnter(firstItem);
    expect(firstItem.style.background).not.toBe('transparent');
    fireEvent.mouseLeave(firstItem);
    expect(firstItem.style.background).toBe('transparent');
  });

  it('hides thumbnail on image load error', () => {
    const { container } = render(<NewsFeed news={mockNews} activeIndex={-1} onSelect={() => {}} />);
    const img = container.querySelector('img');
    fireEvent.error(img);
    expect(img.style.display).toBe('none');
  });

  it('does not highlight items when activeIndex is -1', () => {
    render(<NewsFeed news={mockNews} activeIndex={-1} onSelect={() => {}} />);
    const publisher = screen.getByText('Reuters');
    expect(publisher).toHaveStyle({ color: '#64748b' });
  });
});
