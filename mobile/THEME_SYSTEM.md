# Theme System Documentation

## Overview

The mobile app now includes a comprehensive theme system that supports light, dark, and system-based themes. The theme system is built using Flutter's Material 3 design system and provides consistent styling across the entire application.

## Features

- **Multiple Theme Modes**: Light, Dark, and System (follows device settings)
- **Persistent Theme Selection**: User's theme preference is saved and restored
- **Material 3 Design**: Modern design system with dynamic colors
- **Consistent Styling**: All UI components follow the theme system
- **Easy Theme Switching**: Toggle buttons and settings screen for theme management

## Architecture

### Core Components

1. **ThemeProvider** (`lib/providers/theme_provider.dart`)
   - Manages theme state using ChangeNotifier
   - Handles theme persistence with SharedPreferences
   - Provides theme switching functionality

2. **AppColors** (`lib/utils/app_colors.dart`)
   - Defines color constants and palettes
   - Provides light and dark color schemes
   - Includes status colors (success, error, warning, info)

3. **AppThemes** (`lib/utils/app_themes.dart`)
   - Contains complete theme configurations
   - Defines light and dark themes
   - Includes component-specific theming

4. **Theme Widgets** (`lib/widgets/theme_toggle_button.dart`)
   - Reusable theme toggle components
   - Theme settings tiles
   - Floating action buttons for theme switching

5. **Theme Settings Screen** (`lib/screens/settings/theme_settings_screen.dart`)
   - Dedicated screen for theme management
   - Theme preview functionality
   - Color palette display

## Usage

### Basic Setup

The theme system is automatically initialized in `main.dart`:

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize theme provider
  final themeProvider = ThemeProvider();
  await themeProvider.init();

  runApp(
    MultiProvider(
      providers: [
        // ... other providers
        ChangeNotifierProvider.value(value: themeProvider),
      ],
      child: const MyApp(),
    ),
  );
}
```

### Using Theme Colors

Always use theme colors instead of hardcoded colors:

```dart
// ✅ Good - Uses theme colors
Container(
  color: Theme.of(context).colorScheme.primary,
  child: Text(
    'Hello',
    style: TextStyle(
      color: Theme.of(context).colorScheme.onPrimary,
    ),
  ),
)

// ❌ Bad - Hardcoded colors
Container(
  color: Color(0xFF6366F1),
  child: Text(
    'Hello',
    style: TextStyle(color: Colors.white),
  ),
)
```

### Theme Toggle Components

#### Simple Toggle Button
```dart
ThemeToggleButton()
```

#### Toggle Button with Label
```dart
ThemeToggleButton(showLabel: true)
```

#### Floating Action Button
```dart
ThemeToggleFAB()
```

#### Settings List Tile
```dart
ThemeSettingsTile(
  onTap: () {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const ThemeSettingsScreen(),
      ),
    );
  },
)
```

### Checking Current Theme

```dart
Consumer<ThemeProvider>(
  builder: (context, themeProvider, child) {
    final isDark = themeProvider.isDarkMode(context);
    
    return Container(
      color: isDark ? Colors.black : Colors.white,
      child: Text('Current theme: ${themeProvider.currentThemeDisplayName}'),
    );
  },
)
```

### Programmatic Theme Changes

```dart
final themeProvider = Provider.of<ThemeProvider>(context, listen: false);

// Set specific theme
await themeProvider.setThemeMode(AppThemeMode.dark);

// Toggle between light and dark
await themeProvider.toggleTheme();
```

## Color Palette

### Primary Colors
- **Primary**: `#6366F1` (Indigo)
- **Primary Light**: `#818CF8`
- **Primary Dark**: `#4F46E5`

### Secondary Colors
- **Secondary**: `#10B981` (Emerald)
- **Secondary Light**: `#34D399`
- **Secondary Dark**: `#059669`

### Status Colors
- **Success**: `#10B981`
- **Warning**: `#F59E0B`
- **Error**: `#EF4444`
- **Info**: `#3B82F6`

### Dark Theme Colors
- **Background**: `#0F172A`
- **Surface**: `#1E293B`
- **Card**: `#334155`

## Best Practices

1. **Always use theme colors**: Never hardcode colors in your widgets
2. **Test both themes**: Ensure your UI works in both light and dark modes
3. **Use semantic colors**: Use `primary`, `secondary`, `error` etc. instead of specific color names
4. **Consistent spacing**: Use the theme's spacing and sizing guidelines
5. **Accessibility**: Ensure proper contrast ratios in both themes

## Migration Guide

### Updating Existing Screens

1. **Replace hardcoded colors**:
   ```dart
   // Before
   backgroundColor: Color(0xFF6366F1)
   
   // After
   backgroundColor: Theme.of(context).colorScheme.primary
   ```

2. **Update text styles**:
   ```dart
   // Before
   TextStyle(color: Colors.white, fontSize: 16)
   
   // After
   Theme.of(context).textTheme.bodyLarge?.copyWith(
     color: Theme.of(context).colorScheme.onPrimary,
   )
   ```

3. **Add theme toggle buttons**:
   ```dart
   AppBar(
     actions: [
       ThemeToggleButton(),
       // ... other actions
     ],
   )
   ```

### Common Issues and Solutions

1. **Colors not updating**: Make sure you're using `Theme.of(context)` and not hardcoded colors
2. **Text not visible**: Use appropriate `onSurface`, `onPrimary` colors for text
3. **Inconsistent styling**: Use the predefined theme components instead of custom styling

## Dependencies

- `shared_preferences: ^2.2.2` - For theme persistence
- `provider: ^6.1.2` - For state management
- `google_fonts: ^6.2.1` - For typography

## Future Enhancements

- [ ] Custom color themes
- [ ] High contrast mode
- [ ] Theme animations
- [ ] Per-screen theme overrides
- [ ] Theme scheduling (automatic dark mode at night)